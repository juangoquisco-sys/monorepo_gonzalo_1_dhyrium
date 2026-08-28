import { Fragment, useEffect, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FilePlus2, FileText, FolderOpen, Pencil, Plus, Search, Upload } from 'lucide-react';
import './companyInformation.css';
import type { Option } from '@/types/types';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { openDialog, type DialogHandle } from '@/utils/dialog';
import { createLetterArchiveFolder, deleteLetterArchiveFolder, downloadLetterArchiveFile, duplicateLetterArchiveFolder, getLetterArchiveTree, getLetterRecord, listLetterRecords, moveLetterArchiveFolder, renameLetterArchiveFolder, resolveLetterArchive, restoreLetterRecordVersion, saveLetterRecord, type LetterArchiveFolder, type LetterRecord, type LetterRecordVersion, uploadLetterArchiveFiles } from './letterArchive.service';

const DEFAULT_SECTIONS = [
  'Documentos de trámite',
  'Registro de empresa',
  'Imagen Institucional',
  'Cotizaciones',
  'Asesoría Legal',
  'Contabilidad y Tributaria',
  'Experiencia de la empresa',
  'Experiencia del profesional',
  'Custodia de archivos finales',
];

const DEFAULT_DOCUMENTS = [
  'Cartas',
  'Contrato de Consorcio',
  'Contratos',
  'Hojas de coordinación',
  'Oficios',
  'Memorandos',
  'Informes',
  'Actas de reunión',
  'Actas de coordinación',
];

const DOCUMENT_PANEL_WIDTH_KEY = 'dhyrium-company-document-panel-width';

type DocumentStatus = 'En revisión' | 'Enviada' | 'Respondida' | 'Archivada';

interface CorporateDocument {
  id: string;
  type: string;
  code: string;
  date: string;
  year: string;
  entity: string;
  location: string;
  subject: string;
  status: DocumentStatus;
  recordType: 'Reciente' | 'Histórica';
  archiveRootId?: string;
  versionNumber?: number;
  content?: string;
}

type DocumentForm = Pick<CorporateDocument, 'code' | 'entity' | 'location' | 'subject' | 'status'> & { date: string };

const findArchiveFolder = (folders: LetterArchiveFolder[], folderId: string | null): LetterArchiveFolder | null => {
  for (const folder of folders) {
    if (folder.id === folderId) return folder;
    const child = findArchiveFolder(folder.children, folderId);
    if (child) return child;
  }
  return null;
};

const createDocumentForm = (): DocumentForm => ({
  code: '',
  date: new Date().toISOString().slice(0, 10),
  entity: '',
  location: '',
  subject: '',
  status: 'En revisión',
});

const INITIAL_DOCUMENTS: CorporateDocument[] = [
  { id: 'carta-15', type: 'Cartas', code: 'CARTA-ART-2026-0015', date: '25/8/2026', year: '2026', entity: 'Municipalidad Provincial de Puno', location: 'Puno', subject: 'Remisión de documentación técnica', status: 'En revisión', recordType: 'Reciente' },
  { id: 'carta-14', type: 'Cartas', code: 'CARTA-ART-2026-0014', date: '21/8/2026', year: '2026', entity: 'Gobierno Regional de Puno', location: 'Puno', subject: 'Solicitud de conformidad de servicio', status: 'Enviada', recordType: 'Reciente' },
  { id: 'carta-13', type: 'Cartas', code: 'CARTA-ART-2026-0013', date: '18/8/2026', year: '2026', entity: 'Programa Nacional de Infraestructura', location: 'Lima', subject: 'Entrega de informe de avance', status: 'Respondida', recordType: 'Reciente' },
  { id: 'carta-42', type: 'Cartas', code: 'CARTA-ART-2024-0042', date: '4/11/2024', year: '2024', entity: 'Municipalidad Distrital de Santa Lucía', location: 'Lampa', subject: 'Coordinación de obra', status: 'Archivada', recordType: 'Histórica' },
];

interface NameEditorProps {
  actionLabel: string;
  initialValue?: string;
  onSave: (value: string) => void;
}

const NameEditor = ({ actionLabel, initialValue = '', onSave }: NameEditorProps) => {
  const [value, setValue] = useState(initialValue);

  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault();
        const nextValue = value.trim();
        if (nextValue) onSave(nextValue);
      }}
    >
      <AppInput
        autoFocus
        label="Nombre"
        maxLength={42}
        value={value}
        onChange={event => setValue(event.target.value)}
      />
      <div className="flex justify-end">
        <AppButton type="submit" disabled={!value.trim()}>
          {actionLabel}
        </AppButton>
      </div>
    </form>
  );
};

const documentStatusClass: Record<DocumentStatus, string> = {
  'En revisión': 'bg-warning-muted text-warning',
  Enviada: 'bg-success-muted text-success',
  Respondida: 'bg-info-muted text-primary',
  Archivada: 'bg-muted text-muted-foreground',
};

export const CompanyInformation = () => {
  const { infoId } = useParams();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTIONS[0]);
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState(DEFAULT_DOCUMENTS);
  const [activeDocument, setActiveDocument] = useState(DEFAULT_DOCUMENTS[0]);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [recordType, setRecordType] = useState<CorporateDocument['recordType'] | null>(null);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(createDocumentForm);
  const [archiveDocumentCode, setArchiveDocumentCode] = useState('');
  const [letterDraft, setLetterDraft] = useState('');
  const [letterVersions, setLetterVersions] = useState<LetterRecordVersion[]>([]);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [editingRecordType, setEditingRecordType] = useState<CorporateDocument['recordType'] | null>(null);
  const [letterArchiveRootId, setLetterArchiveRootId] = useState<string | null>(null);
  const [letterArchiveFolders, setLetterArchiveFolders] = useState<LetterArchiveFolder[]>([]);
  const [selectedArchiveFolderId, setSelectedArchiveFolderId] = useState<string | null>(null);
  const [expandedArchiveFolderIds, setExpandedArchiveFolderIds] = useState<string[]>([]);
  const [documentPanelWidth, setDocumentPanelWidth] = useState(() => {
    const storedWidth = Number(window.localStorage.getItem(DOCUMENT_PANEL_WIDTH_KEY));
    return storedWidth >= 10 && storedWidth <= 50 ? storedWidth : 18;
  });

  useEffect(() => {
    window.localStorage.setItem(DOCUMENT_PANEL_WIDTH_KEY, String(documentPanelWidth));
  }, [documentPanelWidth]);

  const refreshLetterArchive = async (rootId: string) => {
    const tree = await getLetterArchiveTree(rootId);
    setLetterArchiveFolders(tree.folders);
    setExpandedArchiveFolderIds(current => [
      ...new Set([...current, ...tree.folders.map(folder => folder.id)]),
    ]);
  };

  useEffect(() => {
    if (!infoId) return;
    listLetterRecords(Number(infoId)).then(({ records }) => {
      const savedRecords = records.map(record => ({ id: `letter-${record.id}`, type: record.type, code: record.code, date: record.date ? `${Number(record.date.slice(8, 10))}/${Number(record.date.slice(5, 7))}/${record.date.slice(0, 4)}` : '', year: record.date.slice(0, 4), entity: record.entity, location: record.location, subject: record.subject, status: record.status as DocumentStatus, recordType: record.recordType, archiveRootId: record.id, versionNumber: record.versionNumber, content: record.content }));
      setDocuments(current => [...savedRecords, ...current.filter(item => !item.archiveRootId)]);
    }).catch(() => undefined);
  }, [infoId]);

  const openNameDialog = (
    title: string,
    actionLabel: string,
    initialValue: string | undefined,
    onSave: (value: string) => void
  ) => {
    let dialogHandle: DialogHandle | null = null;
    dialogHandle = openDialog({
      title,
      children: (
        <NameEditor
          actionLabel={actionLabel}
          initialValue={initialValue}
          onSave={value => {
            onSave(value);
            dialogHandle?.close();
          }}
        />
      ),
      width: 'min(28rem, calc(100vw - 2rem))',
    });
  };

  const addDocumentType = () => {
    openNameDialog('Añadir tipo de documento', 'Añadir', undefined, value => {
      setDocumentTypes(current => [...current, value]);
      setActiveDocument(value);
    });
  };

  const editDocumentType = (name: string) => {
    openNameDialog('Editar tipo de documento', 'Guardar cambios', name, value => {
      setDocumentTypes(current => current.map(item => item === name ? value : item));
      if (activeDocument === name) setActiveDocument(value);
    });
  };

  const deleteDocumentType = (name: string) => {
    let dialogHandle: DialogHandle | null = null;
    dialogHandle = openDialog({
      title: '¿Eliminar tipo de documento?',
      description: `Eliminarás “${name}” de esta lista.`,
      children: (
        <div className="flex justify-end gap-2">
          <AppButton variant="outline" onClick={() => dialogHandle?.close()}>
            Cancelar
          </AppButton>
          <AppButton
            variant="danger"
            onClick={() => {
              setDocumentTypes(current => {
                const next = current.filter(item => item !== name);
                if (activeDocument === name) setActiveDocument(next[0] ?? '');
                return next;
              });
              dialogHandle?.close();
            }}
          >
            Eliminar
          </AppButton>
        </div>
      ),
      width: 'min(28rem, calc(100vw - 2rem))',
    });
  };

  const documentOptions = (name: string): Option[] => [
    { name: 'Añadir', type: 'button', function: addDocumentType },
    { name: 'Editar', type: 'button', function: () => editDocumentType(name) },
    { name: 'Eliminar', type: 'button', function: () => deleteDocumentType(name) },
  ];

  const addRecord = (recordType: CorporateDocument['recordType']) => {
    if (!activeDocument) return;
    const nextNumber = String(documents.length + 1).padStart(4, '0');
    setDocuments(current => [
      {
        id: `${activeDocument}-${Date.now()}`,
        type: activeDocument,
        code: `${activeDocument.slice(0, 5).toUpperCase()}-REG-2026-${nextNumber}`,
        date: '27/8/2026',
        year: '2026',
        entity: 'Empresa seleccionada',
        location: 'Puno',
        subject: recordType === 'Histórica' ? 'Documento histórico pendiente de completar' : `Nuevo registro de ${activeDocument.toLowerCase()}`,
        status: 'En revisión',
        recordType,
      },
      ...current,
    ]);
  };

  const clearDocumentFilters = () => {
    setDocumentNumberFilter('');
    setEntityFilter('');
    setYearFilter('');
    setStatusFilter('');
  };

  const addArchiveFolder = (parentId?: string) => {
    if (!letterArchiveRootId) return;
    openNameDialog(parentId ? 'Nuevo subtítulo' : 'Nuevo título', 'Crear', undefined, async name => {
      const folder = await createLetterArchiveFolder(letterArchiveRootId, name, parentId);
      setSelectedArchiveFolderId(folder.id);
      setExpandedArchiveFolderIds(current => [
        ...new Set([...current, folder.id, ...(parentId ? [parentId] : [])]),
      ]);
      await refreshLetterArchive(letterArchiveRootId);
    });
  };

  const toggleArchiveFolder = (folderId: string) => {
    setExpandedArchiveFolderIds(current => current.includes(folderId)
      ? current.filter(id => id !== folderId)
      : [...current, folderId]);
  };

  const openArchiveFilePicker = (folderId: string) => {
    document.getElementById(`letter-archive-upload-${folderId}`)?.click();
  };

  const archiveRootOptions: Option[] = [
    { name: 'Nuevo título', type: 'button', icon: 'add', function: () => addArchiveFolder() },
  ];

  const archiveTitleOptions = (title: LetterArchiveFolder): Option[] => [
    { name: 'Editar', type: 'button', icon: 'pencil', function: () => renameArchiveFolder(title) },
    { name: 'Eliminar', type: 'button', icon: 'trash-red', function: () => deleteArchiveFolder(title) },
    { name: 'Duplicar', type: 'button', icon: 'document-duplicate', function: () => duplicateArchiveFolder(title) },
    { name: 'Agregar arriba', type: 'button', icon: 'upper', function: () => moveArchiveFolder(title, 'up') },
    { name: 'Agregar abajo', type: 'button', icon: 'lower', function: () => moveArchiveFolder(title, 'down') },
    { name: 'Agregar subtítulo', type: 'button', icon: 'add', function: () => addArchiveFolder(title.id) },
  ];

  const archiveSubtitleOptions = (subtitle: LetterArchiveFolder): Option[] => [
    { name: 'Editar', type: 'button', icon: 'pencil', function: () => renameArchiveFolder(subtitle) },
    { name: 'Eliminar', type: 'button', icon: 'trash-red', function: () => deleteArchiveFolder(subtitle) },
    { name: 'Duplicar', type: 'button', icon: 'document-duplicate', function: () => duplicateArchiveFolder(subtitle) },
    { name: 'Agregar arriba', type: 'button', icon: 'upper', function: () => moveArchiveFolder(subtitle, 'up') },
    { name: 'Agregar abajo', type: 'button', icon: 'lower', function: () => moveArchiveFolder(subtitle, 'down') },
    { name: 'Cargar archivos', type: 'button', icon: 'upload', function: () => openArchiveFilePicker(subtitle.id) },
  ];

  const archiveFolderOptions = (folder: LetterArchiveFolder): Option[] => [
    { name: 'Editar', type: 'button', icon: 'pencil', function: () => renameArchiveFolder(folder) },
    { name: 'Eliminar', type: 'button', icon: 'trash-red', function: () => deleteArchiveFolder(folder) },
    { name: 'Duplicar', type: 'button', icon: 'document-duplicate', function: () => duplicateArchiveFolder(folder) },
    { name: 'Agregar arriba', type: 'button', icon: 'upper', function: () => moveArchiveFolder(folder, 'up') },
    { name: 'Agregar abajo', type: 'button', icon: 'lower', function: () => moveArchiveFolder(folder, 'down') },
    { name: 'Agregar subnivel', type: 'button', icon: 'add', function: () => addArchiveFolder(folder.id) },
  ];

  const renameArchiveFolder = (folder: LetterArchiveFolder) => {
    if (!letterArchiveRootId) return;
    openNameDialog('Editar nombre', 'Guardar cambios', folder.name, async name => {
      await renameLetterArchiveFolder(folder.id, name);
      await refreshLetterArchive(letterArchiveRootId);
    });
  };

  const duplicateArchiveFolder = async (folder: LetterArchiveFolder) => {
    if (!letterArchiveRootId) return;
    const duplicated = await duplicateLetterArchiveFolder(folder.id);
    setSelectedArchiveFolderId(duplicated.id);
    setExpandedArchiveFolderIds(current => [...new Set([...current, duplicated.id, ...(duplicated.parentId ? [duplicated.parentId] : [])])]);
    await refreshLetterArchive(letterArchiveRootId);
  };

  const moveArchiveFolder = async (folder: LetterArchiveFolder, direction: 'up' | 'down') => {
    if (!letterArchiveRootId) return;
    await moveLetterArchiveFolder(folder.id, direction);
    await refreshLetterArchive(letterArchiveRootId);
  };

  const deleteArchiveFolder = (folder: LetterArchiveFolder) => {
    if (!letterArchiveRootId) return;
    let dialogHandle: DialogHandle | null = null;
    dialogHandle = openDialog({
      title: '¿Eliminar carpeta?',
      description: `Eliminarás “${folder.name}”. La carpeta debe estar vacía.`,
      children: <div className="flex justify-end gap-2"><AppButton variant="outline" onClick={() => dialogHandle?.close()}>Cancelar</AppButton><AppButton variant="danger" onClick={async () => { await deleteLetterArchiveFolder(folder.id); if (selectedArchiveFolderId === folder.id) setSelectedArchiveFolderId(null); await refreshLetterArchive(letterArchiveRootId); dialogHandle?.close(); }}>Eliminar</AppButton></div>,
      width: 'min(28rem, calc(100vw - 2rem))',
    });
  };

  const renderArchiveFolder = (folder: LetterArchiveFolder, item: string, depth = 0): JSX.Element => {
    const isExpanded = expandedArchiveFolderIds.includes(folder.id);
    const isSelected = selectedArchiveFolderId === folder.id;
    return <div key={folder.id} className="letter-archive__branch">
      <AppContextMenu className="letter-archive__trigger" data={archiveFolderOptions(folder)}>
        <div className={`letter-archive__row ${depth === 0 ? 'letter-archive__row--title' : 'letter-archive__row--subtitle'} ${isSelected ? 'is-selected' : ''}`}>
          <button type="button" className="letter-archive__toggle" aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${folder.name}`} onClick={() => toggleArchiveFolder(folder.id)}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>
          <span className="letter-archive__number">{item}</span>
          <button type="button" onClick={() => setSelectedArchiveFolderId(folder.id)} className="letter-archive__name"><FolderOpen />{folder.name}</button>
        </div>
      </AppContextMenu>
      {isExpanded && folder.children.length > 0 && <div className="letter-archive__children">
        {folder.children.map((child, index) => renderArchiveFolder(child, `${item}.${index + 1}`, depth + 1))}
      </div>}
    </div>;
  };

  const uploadArchiveFiles = async (folderId: string, files: FileList | null) => {
    if (!files?.length || !letterArchiveRootId) return;
    await uploadLetterArchiveFiles(folderId, files);
    await refreshLetterArchive(letterArchiveRootId);
  };

  const openNewRecordForm = (nextRecordType: CorporateDocument['recordType']) => {
    const nextNumber = String(documents.filter(item => item.type === activeDocument).length + 1).padStart(4, '0');
    setDocumentForm({
      ...createDocumentForm(),
      code: `${activeDocument.slice(0, 5).toUpperCase()}-REG-${new Date().getFullYear()}-${nextNumber}`,
    });
    setArchiveDocumentCode('');
    setLetterDraft('');
    setLetterArchiveRootId(null);
    setLetterArchiveFolders([]);
    setSelectedArchiveFolderId(null);
    setExpandedArchiveFolderIds([]);
    setRecordType(nextRecordType);
  };

  const createLetterDraft = () => {
    const code = documentForm.code.trim();
    if (!code) return;
    const [year, month, day] = documentForm.date.split('-');
    const formattedDate = year && month && day ? `${Number(day)}/${Number(month)}/${year}` : documentForm.date;
    setArchiveDocumentCode(code);
    setLetterDraft(`CARTA N.º ${code}\n\n${documentForm.location || 'Lugar'}, ${formattedDate}\n\nSeñor(a)\n${documentForm.entity.trim() || '[Entidad destinataria]'}\n\nAsunto: ${documentForm.subject.trim() || '[Asunto de la carta]'}\n\nDe mi consideración:\n\nPor medio de la presente, me dirijo a usted para comunicar lo indicado en el asunto.\n\nAtentamente,`);
    window.requestAnimationFrame(() => document.getElementById('letter-elaboration-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const saveLegacyRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeDocument || !recordType) return;
    const [year, month, day] = documentForm.date.split('-');
    if (!year || !month || !day) return;
    setDocuments(current => [{
      id: `${activeDocument}-${Date.now()}`,
      type: activeDocument,
      code: documentForm.code.trim(),
      date: `${Number(day)}/${Number(month)}/${year}`,
      year,
      entity: documentForm.entity.trim(),
      location: documentForm.location.trim(),
      subject: documentForm.subject.trim(),
      status: documentForm.status,
      recordType,
    }, ...current]);
    setRecordType(null);
    setDocumentForm(createDocumentForm());
    setArchiveDocumentCode('');
    setLetterDraft('');
    setLetterArchiveRootId(null);
    setLetterArchiveFolders([]);
    setSelectedArchiveFolderId(null);
    setExpandedArchiveFolderIds([]);
  };

  const clearLetterEditor = () => {
    setDocumentForm(createDocumentForm());
    setArchiveDocumentCode('');
    setLetterDraft('');
    setLetterVersions([]);
    setEditingRecordType(null);
    setLetterArchiveRootId(null);
    setLetterArchiveFolders([]);
    setSelectedArchiveFolderId(null);
    setExpandedArchiveFolderIds([]);
  };

  const inputDate = (value: string) => {
    if (value.includes('-')) return value;
    const [day, month, year] = value.split('/');
    return year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : createDocumentForm().date;
  };

  const ensureLetterArchiveRoot = async (code: string) => {
    if (letterArchiveRootId) return letterArchiveRootId;
    if (!infoId) return null;
    const root = await resolveLetterArchive(Number(infoId), code);
    setLetterArchiveRootId(root.id);
    setArchiveDocumentCode(code);
    await refreshLetterArchive(root.id);
    return root.id;
  };

  const openRecordForm = async (nextRecordType: CorporateDocument['recordType'], document?: CorporateDocument) => {
    if (!document) {
      clearLetterEditor();
      openNewRecordForm(nextRecordType);
      return;
    }
    setDocumentForm({ code: document.code, date: inputDate(document.date), entity: document.entity, location: document.location, subject: document.subject, status: document.status });
    setLetterDraft(document.content ?? '');
    setEditingRecordType(document.recordType);
    setRecordType('Reciente');
    if (!document.archiveRootId || !infoId) {
      setArchiveDocumentCode('');
      setLetterArchiveRootId(null);
      setLetterArchiveFolders([]);
      setLetterVersions([]);
      return;
    }
    const detail = await getLetterRecord(Number(infoId), document.archiveRootId);
    setDocumentForm({ code: detail.record.code, date: detail.record.date, entity: detail.record.entity, location: detail.record.location, subject: detail.record.subject, status: detail.record.status });
    setLetterDraft(detail.record.content);
    setLetterVersions(detail.versions);
    setArchiveDocumentCode(detail.record.code);
    setLetterArchiveRootId(document.archiveRootId);
    await refreshLetterArchive(document.archiveRootId);
  };

  const letterRecordOptions = (item: CorporateDocument): Option[] => [
    { name: 'Editar', type: 'button', icon: 'pencil', function: () => void openRecordForm(item.recordType, item) },
  ];

  const generateLetter = async () => {
    const code = documentForm.code.trim();
    if (!code) return;
    await ensureLetterArchiveRoot(code);
    createLetterDraft();
  };

  const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeDocument || !recordType) return;
    if (activeDocument !== 'Cartas' || recordType !== 'Reciente' || !infoId) {
      saveLegacyRecord(event);
      return;
    }
    setIsSavingLetter(true);
    try {
      const rootId = await ensureLetterArchiveRoot(documentForm.code.trim());
      if (!rootId) return;
      const { record } = await saveLetterRecord(Number(infoId), rootId, { code: documentForm.code.trim(), type: activeDocument, recordType: editingRecordType ?? recordType, date: documentForm.date, entity: documentForm.entity.trim(), location: documentForm.location.trim(), subject: documentForm.subject.trim(), status: documentForm.status, content: letterDraft });
      const savedDocument: CorporateDocument = { id: `letter-${record.id}`, type: record.type, code: record.code, date: `${Number(record.date.slice(8, 10))}/${Number(record.date.slice(5, 7))}/${record.date.slice(0, 4)}`, year: record.date.slice(0, 4), entity: record.entity, location: record.location, subject: record.subject, status: record.status, recordType: record.recordType, archiveRootId: record.id, versionNumber: record.versionNumber, content: record.content };
      setDocuments(current => [savedDocument, ...current.filter(item => item.archiveRootId !== record.id && item.code !== record.code)]);
      setRecordType(null);
      clearLetterEditor();
    } finally {
      setIsSavingLetter(false);
    }
  };

  const restoreLetterVersion = async (version: LetterRecordVersion) => {
    if (!infoId || !letterArchiveRootId) return;
    setIsSavingLetter(true);
    try {
      await restoreLetterRecordVersion(Number(infoId), letterArchiveRootId, version.versionNumber);
      const detail = await getLetterRecord(Number(infoId), letterArchiveRootId);
      setDocumentForm({ code: detail.record.code, date: detail.record.date, entity: detail.record.entity, location: detail.record.location, subject: detail.record.subject, status: detail.record.status });
      setLetterDraft(detail.record.content);
      setLetterVersions(detail.versions);
      await refreshLetterArchive(letterArchiveRootId);
    } finally {
      setIsSavingLetter(false);
    }
  };

  const advanceDocumentStatus = (id: string) => {
    const statuses: DocumentStatus[] = ['En revisión', 'Enviada', 'Respondida', 'Archivada'];
    setDocuments(current => current.map(item => {
      if (item.id !== id) return item;
      return { ...item, status: statuses[(statuses.indexOf(item.status) + 1) % statuses.length] };
    }));
  };

  const resizeDocumentPanels = (event: ReactPointerEvent<HTMLDivElement>) => {
    const workspace = event.currentTarget.parentElement;
    if (!workspace) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const updateWidth = (clientX: number) => {
      const bounds = workspace.getBoundingClientRect();
      const nextWidth = ((clientX - bounds.left) / bounds.width) * 100;
      setDocumentPanelWidth(Math.min(50, Math.max(10, nextWidth)));
    };
    const handleMove = (moveEvent: PointerEvent) => updateWidth(moveEvent.clientX);
    const handleEnd = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
  };

  const sections = [...DEFAULT_SECTIONS, ...customSections];
  const activeDocumentIndex = documentTypes.indexOf(activeDocument) + 1;
  const isDocumentSection = activeSection === DEFAULT_SECTIONS[0];
  const documentYears = [...new Set(documents.filter(item => item.type === activeDocument).map(item => item.year))]
    .sort((firstYear, secondYear) => Number(secondYear) - Number(firstYear));
  const visibleDocuments = documents.filter(item => {
    const normalizedNumber = documentNumberFilter.trim().toLocaleLowerCase();
    const normalizedEntity = entityFilter.trim().toLocaleLowerCase();
    return item.type === activeDocument
      && (!normalizedNumber || item.code.toLocaleLowerCase().includes(normalizedNumber))
      && (!normalizedEntity || [item.entity, item.location].join(' ').toLocaleLowerCase().includes(normalizedEntity))
      && (!yearFilter || item.year === yearFilter)
      && (!statusFilter || item.status === statusFilter);
  });
  const documentsByYear = visibleDocuments.reduce<Record<string, CorporateDocument[]>>((groups, document) => {
    (groups[document.year] ??= []).push(document);
    return groups;
  }, {});
  const selectedArchiveFolder = findArchiveFolder(letterArchiveFolders, selectedArchiveFolderId);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-muted p-0">
      <section className="flex min-h-0 flex-1 flex-col gap-0 rounded-none border-0 bg-card p-0 shadow-none">
        <div className="flex min-w-0 gap-1.5 overflow-x-auto border-b border-border pb-0" aria-label="Secciones de la empresa">
          {sections.map(section => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`h-8 shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors ${activeSection === section ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
            >
              {section}
            </button>
          ))}
          <AppButton
            size="sm"
            variant="outline"
            className="h-8 shrink-0 px-3 text-xs"
            onClick={() => openNameDialog('Nueva pestaña', 'Crear pestaña', undefined, value => {
              setCustomSections(current => [...current, value]);
              setActiveSection(value);
            })}
          >
            <Plus /> Nuevo
          </AppButton>
        </div>

        {isDocumentSection ? (
          <div className="document-workspace" style={{ '--document-panel-width': `${documentPanelWidth}%` } as CSSProperties}>
            <section className="document-workspace__categories min-h-0 overflow-auto px-2 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div><h2 className="text-xs font-semibold text-foreground">Documentos de trámite</h2><p className="text-xs text-muted-foreground">Clic derecho para administrar.</p></div>
                <AppButton size="icon-xs" aria-label="Añadir tipo de documento" onClick={addDocumentType}><Plus /></AppButton>
              </div>
              <div className="grid gap-0.5">
                {documentTypes.map((documentType, index) => (
                  <AppContextMenu key={documentType} data={documentOptions(documentType)}>
                    <button
                      type="button"
                      onClick={() => setActiveDocument(documentType)}
                      className={`flex h-8 min-w-0 w-full items-center gap-2 border-l-2 px-2 py-1 text-left text-xs font-medium transition-colors ${activeDocument === documentType ? 'border-primary text-primary' : 'border-transparent text-foreground hover:bg-muted/50'}`}
                    >
                      <span className="font-semibold text-primary">1.{index + 1}</span>
                      <span className="truncate">{documentType}</span>
                    </button>
                  </AppContextMenu>
                ))}
                {!documentTypes.length && <p className="p-3 text-center text-xs text-muted-foreground">No hay tipos de documento.</p>}
              </div>
            </section>
            <div
              role="separator"
              aria-label="Ajustar ancho de categorías documentales"
              aria-orientation="vertical"
              aria-valuemin={10}
              aria-valuemax={50}
              aria-valuenow={Math.round(documentPanelWidth)}
              tabIndex={0}
              className="document-workspace__divider"
              onPointerDown={resizeDocumentPanels}
              onKeyDown={event => {
                if (event.key === 'ArrowLeft') setDocumentPanelWidth(current => Math.max(10, current - 2));
                if (event.key === 'ArrowRight') setDocumentPanelWidth(current => Math.min(50, current + 2));
              }}
            >
            </div>
            <section className="document-workspace__content flex min-h-72 flex-col rounded-lg border border-border bg-background p-3.5 md:p-4">
              {activeDocument ? <>
                <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">1.{activeDocumentIndex} {activeDocument}</h2>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {activeDocument === 'Cartas' && <AppButton size="sm" className="h-8 px-3 text-xs" variant={recordType === 'Reciente' ? 'primary' : 'outline'} onClick={() => openRecordForm('Reciente')}><FilePlus2 /> Elaborar carta</AppButton>}
                    <AppButton size="sm" className="h-8 px-3 text-xs" variant={recordType === 'Histórica' ? 'primary' : 'outline'} onClick={() => openRecordForm('Histórica')}>Registrar antigua</AppButton>
                    {activeDocument === 'Cartas' ? <AppButton size="sm" className="h-8 px-3 text-xs" variant={!recordType ? 'primary' : 'outline'} onClick={() => setRecordType(null)}>Cartas archivadas</AppButton> : <AppButton size="sm" className="h-8 px-3 text-xs" onClick={() => openRecordForm('Reciente')}><FilePlus2 /> Registrar documento</AppButton>}
                  </div>
                </div>

                {recordType && (
                  <form onSubmit={saveRecord} className={`relative mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 pt-7 ${recordType === 'Reciente' ? 'flex min-h-[calc(100vh-11rem)] flex-1 flex-col' : ''}`}>
                    <p className="absolute right-4 top-2 text-xs font-medium text-muted-foreground">{recordType === 'Histórica' ? 'Registrar documento antiguo' : `Registrar ${activeDocument.toLowerCase()}`}</p>
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="hidden">
                        <p className="text-xs font-medium text-muted-foreground">{recordType === 'Histórica' ? 'Registrar documento antiguo' : `Registrar ${activeDocument.toLowerCase()}`}</p>
                      </div>
                      <AppInput label="Número de documento" required containerClassName="w-full lg:w-80" value={documentForm.code} onChange={event => setDocumentForm(current => ({ ...current, code: event.target.value }))} />
                      <div className="flex shrink-0 gap-2">
                        {recordType === 'Reciente' && <AppButton type="button" size="sm" variant="outline" onClick={generateLetter}><FilePlus2 /> Generar carta</AppButton>}
                        <AppButton type="submit" size="sm" variant="outline" disabled={isSavingLetter || (recordType === 'Reciente' && (!letterDraft.trim() || archiveDocumentCode !== documentForm.code.trim()))}>{isSavingLetter ? 'Guardando...' : recordType === 'Histórica' ? 'Guardar registro antiguo' : 'Guardar carta'}</AppButton>
                        <AppButton type="button" size="sm" variant="outline" onClick={() => setRecordType(null)}>Cancelar</AppButton>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <AppInput label="Fecha" type="date" required value={documentForm.date} onChange={event => setDocumentForm(current => ({ ...current, date: event.target.value }))} />
                      <AppInput label="Entidad" required value={documentForm.entity} onChange={event => setDocumentForm(current => ({ ...current, entity: event.target.value }))} />
                      <AppInput label="Asunto" required value={documentForm.subject} onChange={event => setDocumentForm(current => ({ ...current, subject: event.target.value }))} />
                      <label className="grid gap-1.5 text-sm font-medium leading-none text-foreground">
                        Estado
                        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={documentForm.status} onChange={event => setDocumentForm(current => ({ ...current, status: event.target.value as DocumentStatus }))}>
                          {Object.keys(documentStatusClass).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                    </div>
                    <section className="letter-archive" aria-label="Registro de archivos">
                      <AppContextMenu data={archiveRootOptions} className="letter-archive__tree">
                        {letterArchiveFolders.map((folder, index) => renderArchiveFolder(folder, String(index + 1)))}
                        {false && letterArchiveFolders.map((title, titleIndex) => {
                          const isTitleExpanded = expandedArchiveFolderIds.includes(title.id);
                          const titleSelected = selectedArchiveFolderId === title.id;
                          return <div key={title.id} className="letter-archive__branch">
                            <AppContextMenu data={archiveTitleOptions(title)}>
                            <div className={`letter-archive__row letter-archive__row--title ${titleSelected ? 'is-selected' : ''}`}>
                              <button type="button" className="letter-archive__toggle" aria-label={`${isTitleExpanded ? 'Contraer' : 'Expandir'} ${title.name}`} onClick={() => toggleArchiveFolder(title.id)}>{isTitleExpanded ? <ChevronDown /> : <ChevronRight />}</button>
                              <span className="letter-archive__number">{titleIndex + 1}</span>
                              <button type="button" onClick={() => setSelectedArchiveFolderId(title.id)} className="letter-archive__name"><FolderOpen />{title.name}</button>
                              <button type="button" onClick={() => addArchiveFolder(title.id)} className="letter-archive__action"><Plus /> Agregar subtítulo</button>
                            </div>
                            </AppContextMenu>
                            {isTitleExpanded && <div className="letter-archive__children">
                              {title.children.map((subtitle, subtitleIndex) => {
                                const isSubtitleExpanded = expandedArchiveFolderIds.includes(subtitle.id);
                                const subtitleSelected = selectedArchiveFolderId === subtitle.id;
                                return <div key={subtitle.id} className="letter-archive__branch">
                                  <AppContextMenu data={archiveSubtitleOptions(subtitle)}>
                                  <div className={`letter-archive__row letter-archive__row--subtitle ${subtitleSelected ? 'is-selected' : ''}`}>
                                    <button type="button" className="letter-archive__toggle" aria-label={`${isSubtitleExpanded ? 'Contraer' : 'Expandir'} ${subtitle.name}`} onClick={() => toggleArchiveFolder(subtitle.id)}>{isSubtitleExpanded ? <ChevronDown /> : <ChevronRight />}</button>
                                    <span className="letter-archive__number">{titleIndex + 1}.{subtitleIndex + 1}</span>
                                    <button type="button" onClick={() => setSelectedArchiveFolderId(subtitle.id)} className="letter-archive__name"><FolderOpen />{subtitle.name}</button>
                                    <label className="letter-archive__action"><Upload /><input id={`letter-archive-upload-${subtitle.id}`} type="file" className="sr-only" multiple onChange={event => uploadArchiveFiles(subtitle.id, event.target.files)} /> Cargar archivos</label>
                                  </div>
                                  </AppContextMenu>
                                  {isSubtitleExpanded && subtitle.documents.length > 0 && <div className="letter-archive__files">
                                    {subtitle.documents.map(document => <button key={document.id} type="button" onClick={() => void downloadLetterArchiveFile(document.id, document.originalName)} className="letter-archive__file"><FileText />{document.displayName}</button>)}
                                  </div>}
                                </div>;
                              })}
                              {!title.children.length && <p className="letter-archive__empty-child">Agrega un subtítulo para organizar sus archivos.</p>}
                            </div>}
                          </div>;
                        })}
                        {!letterArchiveFolders.length && <p className="letter-archive__empty">Crea un título para comenzar a organizar los archivos de esta carta.</p>}
                      </AppContextMenu>
                      <div className="letter-archive__detail">
                        {selectedArchiveFolder ? <>
                          <div className="letter-archive__detail-header"><div><p>ARCHIVOS DEL DOCUMENTO</p><strong>{selectedArchiveFolder.name}</strong></div><label className="letter-archive__action"><Upload /><input id={`letter-archive-upload-${selectedArchiveFolder.id}`} type="file" className="sr-only" multiple onChange={event => uploadArchiveFiles(selectedArchiveFolder.id, event.target.files)} /> Adjuntar archivos</label></div>
                          <div className="letter-archive__files">{selectedArchiveFolder.documents.length ? selectedArchiveFolder.documents.map(document => <button key={document.id} type="button" onClick={() => void downloadLetterArchiveFile(document.id, document.originalName)} className="letter-archive__file"><FileText />{document.displayName}</button>) : <p className="letter-archive__empty">Este nivel aún no tiene archivos adjuntos.</p>}</div>
                        </> : <p className="letter-archive__empty">Selecciona un nivel para ver y adjuntar sus archivos.</p>}
                      </div>
                    </section>
                    {recordType === 'Reciente' && <div id="letter-elaboration-area" className="mt-4 flex min-h-[19rem] flex-1 flex-col rounded-md border border-dashed border-border bg-background/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-medium text-foreground">Área de elaboración de la carta</p><span className="text-xs text-muted-foreground">{letterDraft ? 'Carta generada: puedes editarla antes de guardarla.' : 'Completa los datos y pulsa “Generar carta”.'}</span></div>
                      <textarea className="min-h-64 flex-1 resize-y rounded-md border border-input bg-background p-3 font-serif text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={letterDraft} onChange={event => setLetterDraft(event.target.value)} placeholder="El contenido de la carta aparecerá aquí." aria-label="Contenido de la carta" />
                      {letterVersions.length > 0 && <div className="mt-3 border-t border-border pt-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-foreground">Versiones guardadas</p><span className="text-xs text-muted-foreground">Cada guardado conserva una versión.</span></div><div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">{letterVersions.map(version => <div key={version.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/25 px-2.5 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">Versión {version.versionNumber}</p><p className="truncate text-[0.68rem] text-muted-foreground">{new Date(version.createdAt).toLocaleString('es-PE')}</p></div><AppButton type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isSavingLetter} onClick={() => void restoreLetterVersion(version)}>Restaurar</AppButton></div>)}</div></div>}
                    </div>}
                  </form>
                )}

                {recordType !== 'Reciente' && <>
                <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(11rem,1fr)_minmax(12rem,1fr)_10rem_10rem_auto]">
                  <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/25 px-3 text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                    <Search className="size-4 shrink-0" />
                    <input className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" value={documentNumberFilter} onChange={event => setDocumentNumberFilter(event.target.value)} placeholder="N.º de carta" aria-label="Filtrar por número de carta" />
                  </label>
                  <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-muted/25 px-3 text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                    <Search className="size-4 shrink-0" />
                    <input className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" value={entityFilter} onChange={event => setEntityFilter(event.target.value)} placeholder="Entidad" aria-label="Filtrar por entidad" />
                  </label>
                  <select className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary" value={yearFilter} onChange={event => setYearFilter(event.target.value)} aria-label="Filtrar por año">
                    <option value="">Todos los años</option>
                    {documentYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <select className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary" value={statusFilter} onChange={event => setStatusFilter(event.target.value as DocumentStatus | '')} aria-label="Filtrar por estado">
                    <option value="">Todos los estados</option>
                    {Object.keys(documentStatusClass).map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <AppButton size="sm" className="h-8 px-3 text-xs" variant="outline" onClick={clearDocumentFilters}>Limpiar</AppButton>
                </div>

                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
                    <thead className="bg-muted/55 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5">Número</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Entidad / ciudad</th><th className="px-3 py-2.5">Asunto</th><th className="px-3 py-2.5">Estado</th><th className="w-12 px-3 py-2.5"><span className="sr-only">Editar</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documentYears.filter(year => documentsByYear[year]?.length).map(year => (
                        <Fragment key={year}>
                          <tr className="bg-muted/35">
                            <th colSpan={6} scope="rowgroup" className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                              Historial {year}
                              <span className="ml-2 font-normal text-muted-foreground">{documentsByYear[year].length} {documentsByYear[year].length === 1 ? 'documento' : 'documentos'}</span>
                            </th>
                          </tr>
                          {documentsByYear[year].map(item => (
                            <tr key={item.id} className="bg-background hover:bg-muted/35">
                              <td className="px-3 py-2.5 align-top"><p className="font-semibold text-foreground">{item.code}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.recordType}{item.versionNumber ? ` · v${item.versionNumber}` : ''}</p></td>
                              <td className="whitespace-nowrap px-3 py-2.5 align-top text-muted-foreground">{item.date}</td>
                              <td className="px-3 py-2.5 align-top"><p className="font-semibold text-foreground">{item.entity}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.location}</p></td>
                              <td className="px-3 py-2.5 align-top text-foreground">{item.subject}</td>
                              <td className="px-3 py-2.5 align-top"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${documentStatusClass[item.status]}`}>{item.status}</span></td>
                              <td className="px-3 py-2.5 align-top"><AppContextMenu data={letterRecordOptions(item)}><button type="button" onClick={() => void openRecordForm(item.recordType, item)} className="inline-flex size-7 items-center justify-center rounded-md bg-info-muted text-primary hover:bg-primary hover:text-primary-foreground" title={`Editar carta ${item.code}`} aria-label={`Editar carta ${item.code}`}><Pencil className="size-3.5" /></button></AppContextMenu></td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      {!visibleDocuments.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay documentos que coincidan con los filtros seleccionados.</td></tr>}
                    </tbody>
                  </table>
                </div>
                </>}
              </> : <p className="text-sm text-muted-foreground">Seleccione o añada un tipo de documento.</p>}
            </section>
          </div>
        ) : (
          <section className="flex min-h-72 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <h2 className="text-base font-semibold text-foreground">{activeSection}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Esta sección está preparada para gestionar la información de la empresa seleccionada.</p>
          </section>
        )}
      </section>
    </main>
  );
};
