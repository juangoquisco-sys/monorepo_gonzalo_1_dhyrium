import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownload16Regular,
  BookOpen16Regular,
  Desktop16Regular,
  Document16Regular,
  DocumentPdf16Regular,
  History16Regular,
  ShieldLock16Regular,
} from '@fluentui/react-icons';

import { AppButton } from '@/components/app-ui/app-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { FileTask } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { downloadBlob } from '@/utils/tools';
import {
  createTaskDocumentOfficeSession,
  createTaskDocumentPdfPreview,
  downloadTaskDocumentFileVersion,
  ensureTaskDocumentOriginalVersion,
  getTaskDocumentOfficeCapabilities,
  getTaskDocumentOfficeSession,
  listTaskDocumentFileVersions,
  releaseTaskDocumentOfficeSession,
  restoreTaskDocumentFileVersion,
  taskDocumentFileVersionsQueryKey,
  type TaskDocumentFileVersionDto,
  type TaskDocumentKind,
  type TaskDocumentOfficePhase,
  type TaskDocumentOfficeSessionDto,
} from '../../services/taskDocument.service';
import DocxOriginalPreview from './DocxOriginalPreview';
import OfficeWordRibbon from './OfficeWordRibbon';
import TaskDocumentEntry from './TaskDocumentEntry';
import './officeTaskDocumentEditor.css';
import './taskDocumentEditor.css';

interface OfficeTaskDocumentEditorProps {
  taskId: number;
  taskName: string;
  taskKind: TaskDocumentKind;
  headerContent?: ReactNode;
  sourceFile: FileTask | null;
  files: FileTask[];
  onOpenFile: (file: FileTask) => void;
  onUseLegacyEditor: () => void;
}

interface OfficeTaskDocumentSessionProps
  extends Omit<OfficeTaskDocumentEditorProps, 'sourceFile'> {
  sourceFile: FileTask;
}

interface StoredWordSession {
  id: string;
  launchRequestedAt: string | null;
}

interface SessionPresentation {
  detail: string;
  phase: TaskDocumentOfficePhase | 'NONE';
  title: string;
  tone: 'saved' | 'saving' | 'error';
}

interface PreparedSessionCleanupSnapshot {
  launchRequestedAt: string | null;
  phase: TaskDocumentOfficePhase | null;
  sessionId: string;
  storageKey: string;
}

type DocumentSurfaceMode = 'CURRENT' | 'ORIGINAL';

const officeSessionStorageKey = (
  taskKind: TaskDocumentKind,
  taskId: number,
  sourceFileId: number
) => `dhyrium-word-session-v1:${taskKind}:${taskId}:${sourceFileId}`;

const readStoredWordSession = (key: string): StoredWordSession | null => {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredWordSession>;
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    return {
      id: parsed.id,
      launchRequestedAt:
        typeof parsed.launchRequestedAt === 'string'
          ? parsed.launchRequestedAt
          : null,
    };
  } catch {
    return null;
  }
};

const writeStoredWordSession = (
  key: string,
  sessionId: string,
  launchRequestedAt: string | null
) => {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ id: sessionId, launchRequestedAt })
    );
  } catch {
    // La sesión sigue funcionando aunque el navegador bloquee localStorage.
  }
};

const clearStoredWordSession = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // No hay una recuperación local que limpiar cuando storage está bloqueado.
  }
};

const getSessionPhase = (
  session: TaskDocumentOfficeSessionDto | null
): TaskDocumentOfficePhase | null => {
  if (!session) return null;
  if (session.phase) return session.phase;

  switch (session.status) {
    case 'ACTIVE':
      return 'PREPARED';
    case 'SAVED':
      return 'SAVED';
    case 'RELEASED':
      return 'CLOSED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'CONFLICT':
      return 'CONFLICT';
    case 'FAILED':
      return 'FAILED';
  }
};

const terminalSessionPhase = (phase: TaskDocumentOfficePhase | null) =>
  phase === 'CLOSED' ||
  phase === 'EXPIRED' ||
  phase === 'CONFLICT' ||
  phase === 'FAILED';

const sessionNeedsPolling = (session: TaskDocumentOfficeSessionDto | null) => {
  const phase = getSessionPhase(session);
  return Boolean(phase && !terminalSessionPhase(phase));
};

const sessionBlocksDocumentChanges = (
  session: TaskDocumentOfficeSessionDto | null,
  launchRequestedAt: string | null
) => {
  const phase = getSessionPhase(session);
  if (!phase || terminalSessionPhase(phase)) return false;
  if (session?.lockActive) return true;
  if (phase === 'CONTACTED' || phase === 'LOCKED' || phase === 'SAVED') {
    return true;
  }
  return session?.status === 'ACTIVE' && Boolean(launchRequestedAt);
};

const getSessionPresentation = (
  session: TaskDocumentOfficeSessionDto | null,
  launchRequestedAt: string | null,
  options: {
    isPreparing: boolean;
    isReconnecting: boolean;
    error: string | null;
  }
): SessionPresentation => {
  if (options.isReconnecting) {
    return {
      detail: 'Dhyrium está consultando la sesión guardada en este navegador.',
      phase: 'NONE',
      title: 'Reconectando con la sesión de Microsoft Word',
      tone: 'saving',
    };
  }

  if (options.isPreparing) {
    return {
      detail:
        'Se está creando un ticket corto antes de habilitar el enlace local.',
      phase: 'NONE',
      title: 'Preparando la edición en Microsoft Word',
      tone: 'saving',
    };
  }

  if (options.error) {
    return {
      detail: options.error,
      phase: getSessionPhase(session) ?? 'NONE',
      title: 'La sesión de Microsoft Word requiere atención',
      tone: 'error',
    };
  }

  const phase = getSessionPhase(session);
  switch (phase) {
    case 'PREPARED':
      return launchRequestedAt
        ? {
            detail:
              'Se invocó Word, pero el servidor todavía no recibió actividad del programa.',
            phase,
            title: 'Esperando que Microsoft Word contacte a Dhyrium',
            tone: 'saving',
          }
        : {
            detail:
              'El enlace está listo. La edición comenzará únicamente en Word de escritorio.',
            phase,
            title: 'Sesión preparada para Microsoft Word',
            tone: 'saved',
          };
    case 'CONTACTED':
      return {
        detail:
          'Word consultó o descargó el DOCX; Dhyrium aún espera el bloqueo de edición.',
        phase,
        title: 'Microsoft Word contactó con Dhyrium',
        tone: 'saving',
      };
    case 'LOCKED':
      return {
        detail:
          'Dhyrium recibió el bloqueo WebDAV. Los cambios se realizan en la ventana local de Word.',
        phase,
        title: 'Edición activa en Microsoft Word',
        tone: 'saving',
      };
    case 'SAVED':
      return {
        detail: session?.versionReceipt
          ? `Dhyrium confirmó la versión ${session.versionReceipt.versionNumber}; la sesión seguirá activa hasta el cierre.`
          : 'Dhyrium recibió un guardado y está actualizando la versión vigente.',
        phase,
        title: 'Guardado recibido desde Microsoft Word',
        tone: 'saved',
      };
    case 'CLOSED':
      return {
        detail: 'La sesión fue cerrada y ya no conserva un bloqueo de edición.',
        phase,
        title: 'Sesión de Microsoft Word cerrada',
        tone: 'saved',
      };
    case 'EXPIRED':
      return {
        detail:
          'El ticket venció por inactividad. Prepare una sesión nueva para editar.',
        phase,
        title: 'La sesión de Microsoft Word venció',
        tone: 'error',
      };
    case 'CONFLICT':
      return {
        detail:
          'Otra versión cambió durante la edición. Revise las versiones antes de preparar otra sesión.',
        phase,
        title: 'Conflicto de versión de Microsoft Word',
        tone: 'error',
      };
    case 'FAILED':
      return {
        detail:
          'La sesión falló y no se confirmará ningún guardado incompleto.',
        phase,
        title: 'Falló la sesión de Microsoft Word',
        tone: 'error',
      };
    default:
      return {
        detail:
          'Dhyrium prepara un enlace directo al Microsoft Word instalado.',
        phase: 'NONE',
        title: 'Sin sesión activa de Microsoft Word',
        tone: 'saved',
      };
  }
};

interface OfficeDocumentFrameProps {
  actions: ReactNode;
  children: ReactNode;
  files: FileTask[];
  footer: ReactNode;
  headerContent?: ReactNode;
  selectorDisabledReason?: string;
  sourceFile: FileTask | null;
  statusLabel: string;
  statusTone?: 'saved' | 'saving' | 'error';
  taskName: string;
  onOpenFile: (file: FileTask) => void;
  onUseLegacyEditor: () => void;
}

const OfficeDocumentFrame = ({
  actions,
  children,
  files,
  footer,
  headerContent,
  selectorDisabledReason,
  sourceFile,
  statusLabel,
  statusTone = 'saved',
  taskName,
  onOpenFile,
  onUseLegacyEditor,
}: OfficeDocumentFrameProps) => (
  <section
    className="task-document-editor office-document-editor"
    aria-label="Editor de documentos Word de Dhyrium"
    data-testid="dhyrium-writer-workspace"
  >
    <header
      className="task-document-editor__header"
      data-testid="dhyrium-writer-header"
    >
      <div className="task-document-editor__identity">
        <p title={sourceFile?.originalname ?? taskName}>
          {sourceFile?.originalname ?? taskName}
        </p>
        <span
          className={`task-document-editor__save-state is-${statusTone}`}
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </div>

      <div className="task-document-editor__header-content">
        <TaskDocumentEntry
          files={files}
          selectedFile={sourceFile}
          disabledReason={selectorDisabledReason}
          onOpenFile={onOpenFile}
          onUseLegacyEditor={onUseLegacyEditor}
        />
        {headerContent}
      </div>

      <div className="task-document-editor__actions">{actions}</div>
    </header>

    <OfficeWordRibbon
      hasDocument={Boolean(sourceFile)}
      statusLabel={statusLabel}
    />

    <div
      className="task-document-editor__workspace-shell office-document-editor__workspace"
      data-testid="dhyrium-writer-viewport"
    >
      {children}
    </div>

    <footer className="task-document-editor__statusbar">{footer}</footer>
  </section>
);

const OfficeTaskDocumentSession = ({
  taskId,
  taskName,
  taskKind,
  headerContent,
  sourceFile,
  files,
  onOpenFile,
  onUseLegacyEditor,
}: OfficeTaskDocumentSessionProps) => {
  const queryClient = useQueryClient();
  const initialOriginalRef = useRef(false);
  const initialPrepareRef = useRef(false);
  const preparedSessionCleanupRef =
    useRef<PreparedSessionCleanupSnapshot | null>(null);
  const [session, setSession] = useState<TaskDocumentOfficeSessionDto | null>(
    null
  );
  const [originalVersion, setOriginalVersion] =
    useState<TaskDocumentFileVersionDto | null>(null);
  const [surfaceMode, setSurfaceMode] =
    useState<DocumentSurfaceMode>('CURRENT');
  const [launchRequestedAt, setLaunchRequestedAt] = useState<string | null>(
    null
  );
  const [hasAttemptedRecovery, setHasAttemptedRecovery] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [recoverableSessionId, setRecoverableSessionId] = useState<
    string | null
  >(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const versionsKey = useMemo(
    () => taskDocumentFileVersionsQueryKey(taskKind, taskId, sourceFile.id),
    [sourceFile.id, taskId, taskKind]
  );
  const storageKey = useMemo(
    () => officeSessionStorageKey(taskKind, taskId, sourceFile.id),
    [sourceFile.id, taskId, taskKind]
  );

  const capabilitiesQuery = useQuery({
    queryKey: ['task-document-office-capabilities'],
    queryFn: getTaskDocumentOfficeCapabilities,
    staleTime: 60_000,
  });

  const versionsQuery = useQuery({
    queryKey: versionsKey,
    queryFn: () =>
      listTaskDocumentFileVersions(taskKind, taskId, sourceFile.id),
    enabled: Boolean(originalVersion),
    refetchInterval: sessionNeedsPolling(session) ? 4_000 : false,
  });

  const sessionStatusQuery = useQuery({
    queryKey: ['task-document-office-session', session?.id],
    queryFn: () => getTaskDocumentOfficeSession(session!.id),
    enabled: Boolean(session?.id && sessionNeedsPolling(session)),
    refetchInterval: query =>
      sessionNeedsPolling(query.state.data ?? session) ? 2_500 : false,
    retry: 2,
  });

  const liveSession = useMemo<TaskDocumentOfficeSessionDto | null>(
    () =>
      session && sessionStatusQuery.data?.id === session.id
        ? { ...session, ...sessionStatusQuery.data }
        : session,
    [session, sessionStatusQuery.data]
  );
  const livePhase = getSessionPhase(liveSession);

  useEffect(() => {
    preparedSessionCleanupRef.current = liveSession?.id
      ? {
          launchRequestedAt,
          phase: livePhase,
          sessionId: liveSession.id,
          storageKey,
        }
      : null;
  }, [launchRequestedAt, livePhase, liveSession?.id, storageKey]);

  useEffect(
    () => () => {
      const snapshot = preparedSessionCleanupRef.current;
      if (
        !snapshot ||
        snapshot.phase !== 'PREPARED' ||
        snapshot.launchRequestedAt
      ) {
        return;
      }

      preparedSessionCleanupRef.current = null;
      clearStoredWordSession(snapshot.storageKey);
      void releaseTaskDocumentOfficeSession(snapshot.sessionId).catch(
        () => undefined
      );
    },
    []
  );

  useEffect(() => {
    if (
      sessionStatusQuery.data &&
      terminalSessionPhase(getSessionPhase(sessionStatusQuery.data))
    ) {
      clearStoredWordSession(storageKey);
    }
  }, [sessionStatusQuery.data, storageKey]);

  useEffect(() => {
    const receiptId = liveSession?.versionReceipt?.id;
    if (!receiptId && livePhase !== 'CLOSED') return;
    void queryClient.invalidateQueries({ queryKey: versionsKey });
  }, [livePhase, liveSession?.versionReceipt?.id, queryClient, versionsKey]);

  useEffect(() => {
    if (!liveSession?.id) return;
    if (terminalSessionPhase(livePhase)) {
      clearStoredWordSession(storageKey);
      return;
    }
    writeStoredWordSession(storageKey, liveSession.id, launchRequestedAt);
  }, [launchRequestedAt, livePhase, liveSession?.id, storageKey]);

  const recoverPersistedSession = useCallback(async () => {
    const stored = readStoredWordSession(storageKey);
    if (!stored) {
      setRecoverableSessionId(null);
      setHasAttemptedRecovery(true);
      return;
    }

    setIsReconnecting(true);
    setSessionError(null);
    setRecoverableSessionId(stored.id);
    try {
      const recovered = await getTaskDocumentOfficeSession(stored.id);
      if (recovered.binding?.sourceFileId !== sourceFile.id) {
        clearStoredWordSession(storageKey);
        setRecoverableSessionId(null);
        throw new Error(
          'La sesión guardada pertenece a otro documento y fue descartada.'
        );
      }

      if (
        getSessionPhase(recovered) === 'PREPARED' &&
        !recovered.wordDesktop?.launchUri
      ) {
        clearStoredWordSession(storageKey);
        setSession(null);
        setLaunchRequestedAt(null);
        setRecoverableSessionId(null);
        setSessionError(
          'La sesión guardada no incluye un enlace reutilizable para Microsoft Word. Prepare una nueva sesión para continuar; Dhyrium comprobará antes que Word no haya contactado.'
        );
        return;
      }

      setSession(recovered);
      setLaunchRequestedAt(stored.launchRequestedAt);
      setRecoverableSessionId(null);
      if (terminalSessionPhase(getSessionPhase(recovered))) {
        clearStoredWordSession(storageKey);
      }
    } catch (error) {
      setSessionError(
        error instanceof Error
          ? error.message
          : 'No se pudo recuperar la sesión anterior de Microsoft Word.'
      );
    } finally {
      setHasAttemptedRecovery(true);
      setIsReconnecting(false);
    }
  }, [sourceFile.id, storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void recoverPersistedSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recoverPersistedSession]);

  const ensureOriginalMutation = useMutation({
    mutationFn: () =>
      ensureTaskDocumentOriginalVersion(taskKind, taskId, sourceFile.id),
    onSuccess: version => {
      setOriginalVersion(version);
      setDocumentError(null);
      void queryClient.invalidateQueries({ queryKey: versionsKey });
    },
    onError: error => {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el DOCX original.';
      setDocumentError(message);
      SnackbarUtilities.error(message);
    },
  });

  useEffect(() => {
    if (initialOriginalRef.current) return;
    initialOriginalRef.current = true;
    ensureOriginalMutation.mutate();
  }, [ensureOriginalMutation]);

  const prepareWordMutation = useMutation({
    mutationFn: async () => {
      if (liveSession && !terminalSessionPhase(livePhase)) return liveSession;
      const nextSession = await createTaskDocumentOfficeSession(
        taskKind,
        taskId,
        sourceFile.id
      );
      if (nextSession.binding?.sourceFileId !== sourceFile.id) {
        await releaseTaskDocumentOfficeSession(nextSession.id);
        throw new Error(
          'Dhyrium rechazó una sesión asociada a otro archivo DOCX.'
        );
      }
      return nextSession;
    },
    onSuccess: nextSession => {
      setSession(nextSession);
      setLaunchRequestedAt(null);
      setRecoverableSessionId(null);
      setSessionError(null);
      setSurfaceMode('CURRENT');
      writeStoredWordSession(storageKey, nextSession.id, null);
    },
    onError: error => {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo preparar Microsoft Word.';
      setSessionError(message);
      SnackbarUtilities.error(message);
    },
  });

  const wordAvailable = capabilitiesQuery.data?.wordDesktop.available ?? false;
  const pollingError = sessionStatusQuery.isError
    ? 'No se pudo actualizar el estado de Word. La sesión se conserva para reintentar la conexión.'
    : null;
  const effectiveSessionError = sessionError ?? pollingError;

  useEffect(() => {
    if (
      initialPrepareRef.current ||
      !hasAttemptedRecovery ||
      !wordAvailable ||
      !originalVersion ||
      liveSession ||
      effectiveSessionError ||
      recoverableSessionId
    ) {
      return;
    }
    initialPrepareRef.current = true;
    prepareWordMutation.mutate();
  }, [
    hasAttemptedRecovery,
    liveSession,
    originalVersion,
    prepareWordMutation,
    recoverableSessionId,
    effectiveSessionError,
    wordAvailable,
  ]);

  const releaseWordMutation = useMutation({
    mutationFn: (sessionId: string) =>
      releaseTaskDocumentOfficeSession(sessionId),
    onSuccess: (_, releasedSessionId) => {
      if (preparedSessionCleanupRef.current?.sessionId === releasedSessionId) {
        preparedSessionCleanupRef.current = null;
      }
      queryClient.removeQueries({
        queryKey: ['task-document-office-session', releasedSessionId],
        exact: true,
      });
      clearStoredWordSession(storageKey);
      setLaunchRequestedAt(null);
      setRecoverableSessionId(null);
      setSessionError(null);
      setSession(current =>
        current?.id === releasedSessionId
          ? {
              ...current,
              status: 'RELEASED',
              phase: 'CLOSED',
              lockActive: false,
            }
          : null
      );
      SnackbarUtilities.success('La sesión de Microsoft Word fue cerrada.');
    },
    onError: error => {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar la sesión de Microsoft Word.';
      setSessionError(message);
      SnackbarUtilities.error(message);
    },
  });

  const latestVersion = useMemo(() => {
    const candidates = [
      ...(versionsQuery.data ?? []),
      liveSession?.version ?? null,
    ].filter((version): version is TaskDocumentFileVersionDto =>
      Boolean(version)
    );

    if (versionsQuery.isSuccess && !candidates.length && originalVersion) {
      candidates.push(originalVersion);
    }

    return candidates.reduce<TaskDocumentFileVersionDto | null>(
      (latest, version) =>
        !latest || version.versionNumber > latest.versionNumber
          ? version
          : latest,
      null
    );
  }, [
    liveSession?.version,
    originalVersion,
    versionsQuery.data,
    versionsQuery.isSuccess,
  ]);

  const protectedOriginalVersion = useMemo(
    () =>
      [...(versionsQuery.data ?? []), originalVersion]
        .filter((version): version is TaskDocumentFileVersionDto =>
          Boolean(version)
        )
        .filter(version => version.source === 'ORIGINAL_IMPORT')
        .sort((left, right) => left.versionNumber - right.versionNumber)[0] ??
      null,
    [originalVersion, versionsQuery.data]
  );

  const previewVersion =
    surfaceMode === 'ORIGINAL' ? protectedOriginalVersion : latestVersion;

  const previewFileQuery = useQuery({
    queryKey: [
      ...versionsKey,
      'readonly-preview',
      previewVersion?.versionNumber ?? null,
    ],
    queryFn: () =>
      downloadTaskDocumentFileVersion(
        taskKind,
        taskId,
        previewVersion!.versionNumber,
        sourceFile.id
      ),
    enabled: Boolean(previewVersion),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionNumber: number) => {
      if (liveSession && !terminalSessionPhase(livePhase)) {
        if (livePhase !== 'PREPARED' || launchRequestedAt) {
          throw new Error(
            'Cierre el documento en Microsoft Word antes de restaurar una versión.'
          );
        }
        await releaseTaskDocumentOfficeSession(liveSession.id);
        if (preparedSessionCleanupRef.current?.sessionId === liveSession.id) {
          preparedSessionCleanupRef.current = null;
        }
        clearStoredWordSession(storageKey);
        setSession(null);
      }
      return restoreTaskDocumentFileVersion(
        taskKind,
        taskId,
        versionNumber,
        sourceFile.id
      );
    },
    onSuccess: restored => {
      SnackbarUtilities.success(
        `Se creó la versión ${restored.versionNumber} desde la versión restaurada.`
      );
      setSurfaceMode('CURRENT');
      setLaunchRequestedAt(null);
      void queryClient.invalidateQueries({ queryKey: versionsKey });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo restaurar la versión.'
      );
    },
  });

  const downloadVersion = useCallback(
    async (versionNumber: number, originalName: string) => {
      const blob = await downloadTaskDocumentFileVersion(
        taskKind,
        taskId,
        versionNumber,
        sourceFile.id
      );
      downloadBlob(blob, `v${versionNumber}-${originalName}`);
    },
    [sourceFile.id, taskId, taskKind]
  );

  const downloadCurrentWord = useCallback(async () => {
    if (!latestVersion) {
      SnackbarUtilities.error(
        'Todavía no existe una versión DOCX descargable.'
      );
      return;
    }
    await downloadVersion(
      latestVersion.versionNumber,
      latestVersion.originalName
    );
  }, [downloadVersion, latestVersion]);

  const downloadCurrentPdf = useCallback(async () => {
    if (!latestVersion) {
      SnackbarUtilities.error('Todavía no existe una versión para exportar.');
      return;
    }
    try {
      const docx = await downloadTaskDocumentFileVersion(
        taskKind,
        taskId,
        latestVersion.versionNumber,
        sourceFile.id
      );
      const preview = await createTaskDocumentPdfPreview(
        docx,
        latestVersion.originalName
      );
      const pdfName =
        latestVersion.originalName.replace(/\.docx$/i, '') + '.pdf';
      downloadBlob(
        new Blob([preview.data], { type: 'application/pdf' }),
        pdfName
      );
    } catch (error) {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo generar el PDF.'
      );
    }
  }, [latestVersion, sourceFile.id, taskId, taskKind]);

  const markWordLaunchRequested = useCallback(() => {
    const requestedAt = new Date().toISOString();
    setLaunchRequestedAt(requestedAt);
    setSurfaceMode('CURRENT');
    setSessionError(null);
    if (liveSession?.id) {
      writeStoredWordSession(storageKey, liveSession.id, requestedAt);
    }
  }, [liveSession, storageKey]);

  const prepareAnotherSession = () => {
    initialPrepareRef.current = true;
    clearStoredWordSession(storageKey);
    setSession(null);
    setLaunchRequestedAt(null);
    setRecoverableSessionId(null);
    setSessionError(null);
    prepareWordMutation.mutate();
  };

  const releaseCurrentSession = () => {
    const sessionId = liveSession?.id ?? recoverableSessionId;
    if (sessionId) releaseWordMutation.mutate(sessionId);
  };

  const handleOpenFile = useCallback(
    (file: FileTask) => {
      if (liveSession && livePhase === 'PREPARED' && !launchRequestedAt) {
        void releaseTaskDocumentOfficeSession(liveSession.id)
          .then(() => {
            if (
              preparedSessionCleanupRef.current?.sessionId === liveSession.id
            ) {
              preparedSessionCleanupRef.current = null;
            }
            clearStoredWordSession(storageKey);
            onOpenFile(file);
          })
          .catch(error => {
            SnackbarUtilities.error(
              error instanceof Error
                ? error.message
                : 'No se pudo cancelar la preparación anterior.'
            );
          });
        return;
      }
      onOpenFile(file);
    },
    [launchRequestedAt, livePhase, liveSession, onOpenFile, storageKey]
  );

  const sessionPresentation = getSessionPresentation(
    liveSession,
    launchRequestedAt,
    {
      isPreparing: prepareWordMutation.isPending,
      isReconnecting,
      error: effectiveSessionError,
    }
  );
  const wordStatusLabel = `Vista previa no editable · ${sessionPresentation.title}`;
  const wordLaunchHref =
    liveSession && !terminalSessionPhase(livePhase)
      ? liveSession.wordDesktop?.launchUri
      : undefined;

  const wordDisabledReason = capabilitiesQuery.isLoading
    ? 'Se está comprobando la disponibilidad de Microsoft Word.'
    : !wordAvailable
    ? 'Microsoft Word no está habilitado para esta instalación de Dhyrium.'
    : !originalVersion
    ? 'El DOCX canónico se está preparando.'
    : isReconnecting
    ? 'Dhyrium está recuperando la sesión anterior.'
    : prepareWordMutation.isPending
    ? 'Se está preparando el enlace directo a Microsoft Word.'
    : effectiveSessionError
    ? effectiveSessionError
    : terminalSessionPhase(livePhase)
    ? 'Prepare una sesión nueva antes de abrir Microsoft Word.'
    : !wordLaunchHref
    ? 'El servidor todavía no devolvió el enlace para Microsoft Word.'
    : null;
  const originalDisabledReason = !protectedOriginalVersion
    ? 'El original protegido se está preparando.'
    : surfaceMode === 'ORIGINAL'
    ? 'Ya se está mostrando el original protegido.'
    : null;
  const downloadDisabledReason = latestVersion
    ? null
    : 'Todavía no existe una versión DOCX descargable.';
  const blocksDocumentChanges = sessionBlocksDocumentChanges(
    liveSession,
    launchRequestedAt
  );
  const statusLabelWithReason = (label: string, reason: string | null) =>
    reason ? `${label}. ${reason}` : label;

  const actions = (
    <>
      <AppButton
        size="xs"
        variant="outline"
        disabled={Boolean(originalDisabledReason)}
        aria-label={statusLabelWithReason('Original', originalDisabledReason)}
        title={
          originalDisabledReason ??
          'Mostrar el archivo original protegido sin modificarlo'
        }
        onClick={() => setSurfaceMode('ORIGINAL')}
      >
        <BookOpen16Regular aria-hidden="true" />
        Original
      </AppButton>

      {wordLaunchHref && !wordDisabledReason ? (
        <AppButton size="xs" asChild>
          <a
            href={wordLaunchHref}
            aria-label="Abrir en Word"
            data-testid="dhyrium-writer-word-launch"
            title="Abrir la versión vigente en Microsoft Word de escritorio"
            onClick={markWordLaunchRequested}
          >
            <Desktop16Regular aria-hidden="true" />
            {launchRequestedAt ? 'Reintentar Word' : 'Abrir en Word'}
          </a>
        </AppButton>
      ) : (
        <AppButton
          size="xs"
          disabled
          aria-label={statusLabelWithReason(
            'Abrir en Word',
            wordDisabledReason
          )}
          title={wordDisabledReason ?? 'La sesión todavía no está lista.'}
        >
          <Desktop16Regular aria-hidden="true" />
          Abrir en Word
        </AppButton>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <AppButton size="xs" variant="outline" title="Versiones DOCX">
            <History16Regular aria-hidden="true" />
            Versiones
          </AppButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-2">
          <div className="office-document-editor__versions">
            <div>
              <strong>Versiones DOCX inmutables</strong>
              <small className="block">
                La versión más alta es la vigente; restaurar crea otra versión.
              </small>
            </div>

            {versionsQuery.isLoading && (
              <p
                className="office-document-editor__version-message"
                role="status"
              >
                Consultando las versiones del documento…
              </p>
            )}

            {!versionsQuery.isLoading && !versionsQuery.data?.length && (
              <p className="office-document-editor__version-message">
                La primera versión todavía se está preparando.
              </p>
            )}

            {versionsQuery.data?.map(version => {
              const restoreBlockedByWord = blocksDocumentChanges;
              const restoreDisabled =
                restoreBlockedByWord ||
                version.versionNumber === latestVersion?.versionNumber ||
                restoreVersionMutation.isPending;
              const restoreReason = restoreBlockedByWord
                ? 'Cierre Microsoft Word antes de restaurar una versión.'
                : version.versionNumber === latestVersion?.versionNumber
                ? 'Esta ya es la versión vigente.'
                : restoreVersionMutation.isPending
                ? 'Se está restaurando otra versión.'
                : null;

              return (
                <div
                  key={version.id}
                  className="office-document-editor__version-row"
                >
                  <div>
                    <strong>
                      {version.versionNumber === latestVersion?.versionNumber
                        ? `Versión vigente · v${version.versionNumber}`
                        : version.source === 'ORIGINAL_IMPORT'
                        ? 'Original protegido'
                        : `Microsoft Word · versión ${version.versionNumber}`}
                    </strong>
                    <small>
                      {version.source} · {version.createdBy?.name ?? 'Dhyrium'}
                    </small>
                  </div>
                  <AppButton
                    size="xs"
                    variant="ghost"
                    title="Descargar esta versión"
                    aria-label={`Descargar la versión ${version.versionNumber}`}
                    onClick={() =>
                      void downloadVersion(
                        version.versionNumber,
                        version.originalName
                      )
                    }
                  >
                    <ArrowDownload16Regular aria-hidden="true" />
                  </AppButton>
                  <AppButton
                    size="xs"
                    variant="outline"
                    disabled={restoreDisabled}
                    aria-label={statusLabelWithReason(
                      `Restaurar versión ${version.versionNumber}`,
                      restoreReason
                    )}
                    title={restoreReason ?? 'Restaurar como una versión nueva'}
                    onClick={() =>
                      restoreVersionMutation.mutate(version.versionNumber)
                    }
                  >
                    Restaurar
                  </AppButton>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <AppButton
        size="xs"
        variant="outline"
        disabled={Boolean(downloadDisabledReason)}
        aria-label={statusLabelWithReason(
          'Descargar Word',
          downloadDisabledReason
        )}
        title={downloadDisabledReason ?? 'Descargar la versión DOCX vigente'}
        onClick={() => void downloadCurrentWord()}
      >
        <Document16Regular aria-hidden="true" />
        Word
      </AppButton>

      <AppButton
        size="xs"
        variant="outline"
        disabled={Boolean(downloadDisabledReason)}
        aria-label={statusLabelWithReason(
          'Descargar PDF',
          downloadDisabledReason
        )}
        title={
          downloadDisabledReason ?? 'Generar PDF desde la versión DOCX vigente'
        }
        onClick={() => void downloadCurrentPdf()}
      >
        <DocumentPdf16Regular aria-hidden="true" />
        PDF
      </AppButton>
    </>
  );

  const sessionIsOpen = Boolean(
    liveSession && !terminalSessionPhase(livePhase)
  );
  const usesDevelopmentHttpTransport =
    capabilitiesQuery.data?.wordDesktop.secureTransport === false ||
    liveSession?.wordDesktop?.secureTransport === false;
  const canPrepareAnother =
    wordAvailable &&
    Boolean(originalVersion) &&
    !isReconnecting &&
    !prepareWordMutation.isPending &&
    (!sessionIsOpen || Boolean(effectiveSessionError));

  const sessionBar = (
    <section
      className="office-document-editor__session-bar"
      data-phase={sessionPresentation.phase}
      data-testid="dhyrium-writer-word-session"
      aria-live="polite"
    >
      <span className="office-document-editor__session-copy">
        <strong>{sessionPresentation.title}</strong>
        <small>{sessionPresentation.detail}</small>
      </span>
      <span className="office-document-editor__session-actions">
        {launchRequestedAt && livePhase === 'PREPARED' && wordLaunchHref && (
          <a href={wordLaunchHref} onClick={markWordLaunchRequested}>
            Reintentar apertura
          </a>
        )}
        {effectiveSessionError && liveSession?.id && (
          <AppButton
            size="xs"
            variant="outline"
            onClick={() => void sessionStatusQuery.refetch()}
          >
            Reintentar estado
          </AppButton>
        )}
        {effectiveSessionError && recoverableSessionId && !liveSession && (
          <AppButton
            size="xs"
            variant="outline"
            onClick={() => void recoverPersistedSession()}
          >
            Reconectar
          </AppButton>
        )}
        {canPrepareAnother &&
          (!liveSession || terminalSessionPhase(livePhase)) && (
            <AppButton
              size="xs"
              variant="outline"
              onClick={prepareAnotherSession}
            >
              Preparar nueva sesión
            </AppButton>
          )}
        {(sessionIsOpen || recoverableSessionId) && (
          <AppButton
            size="xs"
            variant="ghost"
            disabled={releaseWordMutation.isPending}
            onClick={releaseCurrentSession}
          >
            {livePhase === 'PREPARED' && !launchRequestedAt
              ? 'Cancelar preparación'
              : 'Cerrar sesión'}
          </AppButton>
        )}
      </span>
    </section>
  );

  const footer = (
    <>
      <span>
        <ShieldLock16Regular aria-hidden="true" /> Original protegido
      </span>
      <span>
        <History16Regular aria-hidden="true" />{' '}
        {versionsQuery.data?.length ?? 0} versiones binarias
      </span>
      <span>
        Vista previa{' '}
        {surfaceMode === 'ORIGINAL'
          ? 'del original'
          : latestVersion
          ? `vigente v${latestVersion.versionNumber}`
          : 'vigente'}{' '}
        · solo lectura
      </span>
      <span className="task-document-editor__statusbar-spacer" />
      <span>{liveSession?.editor?.name ?? 'Sin editor confirmado'}</span>
      <span>Microsoft Word de escritorio</span>
      <span>{sessionPresentation.title}</span>
    </>
  );

  return (
    <OfficeDocumentFrame
      taskName={taskName}
      sourceFile={sourceFile}
      files={files}
      statusLabel={wordStatusLabel}
      statusTone={documentError ? 'error' : sessionPresentation.tone}
      selectorDisabledReason={
        blocksDocumentChanges
          ? 'Cierre la sesión de Microsoft Word antes de cambiar de archivo.'
          : undefined
      }
      actions={actions}
      footer={footer}
      headerContent={headerContent}
      onOpenFile={handleOpenFile}
      onUseLegacyEditor={onUseLegacyEditor}
    >
      {sessionBar}

      {usesDevelopmentHttpTransport && (
        <p
          className="office-document-editor__transport-warning"
          data-testid="dhyrium-writer-http-warning"
          role="note"
        >
          HTTP solo para desarrollo; edición fluida/producción requiere HTTPS
          confiable.
        </p>
      )}

      {previewVersion && previewFileQuery.data ? (
        <DocxOriginalPreview
          key={`${surfaceMode}-${previewVersion.versionNumber}`}
          file={previewFileQuery.data}
          fileName={previewVersion.originalName || sourceFile.originalname}
          previewKind={surfaceMode}
          versionNumber={previewVersion.versionNumber}
          wordLaunchDisabledReason={wordDisabledReason ?? undefined}
          wordLaunchHref={wordLaunchHref}
          onShowCurrent={
            surfaceMode === 'ORIGINAL'
              ? () => setSurfaceMode('CURRENT')
              : undefined
          }
          onWordLaunch={markWordLaunchRequested}
        />
      ) : (
        <div className="office-document-editor__viewport">
          <article className="office-document-editor__page">
            <div className="office-document-editor__page-state">
              <Document16Regular aria-hidden="true" />
              <p className="office-document-editor__eyebrow" role="status">
                Vista previa no editable
              </p>
              <h2>
                {previewFileQuery.isError
                  ? 'No se pudo cargar la vista previa'
                  : 'Preparando la versión vigente'}
              </h2>
              <p>
                La cinta web es una referencia visual. Para escribir y aplicar
                comandos, use la ventana real de Microsoft Word.
              </p>
              {previewFileQuery.isError && (
                <AppButton
                  size="sm"
                  variant="outline"
                  onClick={() => void previewFileQuery.refetch()}
                >
                  Reintentar vista previa
                </AppButton>
              )}
            </div>
          </article>
        </div>
      )}

      {ensureOriginalMutation.isPending && !originalVersion && (
        <div className="office-document-editor__overlay" role="status">
          <span className="office-document-editor__spinner" />
          Registrando el DOCX original sin modificarlo…
        </div>
      )}

      {documentError && !ensureOriginalMutation.isPending && (
        <div className="office-document-editor__overlay is-error" role="alert">
          <strong>No se pudo preparar el documento.</strong>
          <span>{documentError}</span>
          <AppButton size="sm" onClick={() => ensureOriginalMutation.mutate()}>
            Reintentar
          </AppButton>
        </div>
      )}
    </OfficeDocumentFrame>
  );
};

interface DisabledDocumentActionProps {
  icon: ReactNode;
  label: string;
  reason: string;
}

const DisabledDocumentAction = ({
  icon,
  label,
  reason,
}: DisabledDocumentActionProps) => (
  <AppButton
    size="xs"
    variant="outline"
    disabled
    aria-label={`${label}. ${reason}`}
    title={reason}
  >
    {icon}
    {label}
  </AppButton>
);

const OfficeTaskDocumentEmpty = ({
  taskName,
  headerContent,
  files,
  onOpenFile,
  onUseLegacyEditor,
}: OfficeTaskDocumentEditorProps) => {
  const reason = 'Seleccione un documento DOCX para habilitar esta acción.';
  const actions = (
    <>
      <DisabledDocumentAction
        icon={<BookOpen16Regular aria-hidden="true" />}
        label="Original"
        reason={reason}
      />
      <DisabledDocumentAction
        icon={<Desktop16Regular aria-hidden="true" />}
        label="Abrir en Word"
        reason={reason}
      />
      <DisabledDocumentAction
        icon={<History16Regular aria-hidden="true" />}
        label="Versiones"
        reason={reason}
      />
      <DisabledDocumentAction
        icon={<Document16Regular aria-hidden="true" />}
        label="Word"
        reason={reason}
      />
      <DisabledDocumentAction
        icon={<DocumentPdf16Regular aria-hidden="true" />}
        label="PDF"
        reason={reason}
      />
    </>
  );

  return (
    <OfficeDocumentFrame
      taskName={taskName}
      sourceFile={null}
      files={files}
      statusLabel="Sin documento DOCX seleccionado"
      actions={actions}
      footer={
        <>
          <span>
            <ShieldLock16Regular aria-hidden="true" /> Original protegido
          </span>
          <span>
            <History16Regular aria-hidden="true" /> 0 versiones binarias
          </span>
          <span>Vista previa no editable</span>
          <span className="task-document-editor__statusbar-spacer" />
          <span>Sin editor confirmado</span>
          <span>Microsoft Word de escritorio</span>
          <span>Sin sesión</span>
        </>
      }
      headerContent={headerContent}
      onOpenFile={onOpenFile}
      onUseLegacyEditor={onUseLegacyEditor}
    >
      <div className="office-document-editor__viewport">
        <article className="office-document-editor__page">
          <div className="office-document-editor__page-state">
            <Document16Regular aria-hidden="true" />
            <p className="office-document-editor__eyebrow">
              Vista previa no editable
            </p>
            <h2>Seleccione un documento Word</h2>
            <p>
              Use el selector del encabezado para abrir un DOCX. La edición y
              los comandos ocurrirán en el Microsoft Word instalado.
            </p>
          </div>
        </article>
      </div>
    </OfficeDocumentFrame>
  );
};

const OfficeTaskDocumentEditor = (props: OfficeTaskDocumentEditorProps) => {
  if (!props.sourceFile) {
    return <OfficeTaskDocumentEmpty {...props} />;
  }

  return <OfficeTaskDocumentSession {...props} sourceFile={props.sourceFile} />;
};

export default OfficeTaskDocumentEditor;
