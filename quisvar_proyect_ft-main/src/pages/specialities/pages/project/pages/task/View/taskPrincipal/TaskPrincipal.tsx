import {
  Fragment,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import { AppButton } from '@/components/app-ui/app-button';
import DivFlex from '@/components/divFlex/DivFlex';
import LoaderText from '@/components/loaderText/LoaderText';
import SubtaskFile from '../../components/subtaskFiles/SubtaskFile';
import TaskCardHeader from '../../components/taskCardHeader/TaskCardHeader';
import TaskCardInfo from '../../components/taskCardInfo/TaskCardInfo';
import TaskCardSelect from '../../components/taskCardSelect/TaskCardSelect';
import TaskCardUpload from '../../components/TaskCardUpload/TaskCardUpload';
import TaskCardUploadNormal from '../../components/TaskCardUpload/TaskCardUploadNormal';
import TaskInputPercentage from '../../components/taskInputPercentage/TaskInputPercentage';
import TaskFeedbackInfo from '../../components/taskFeedbackInfo/TaskFeedbackInfo';
import TaskHistory from '../../components/taskHistory/TaskHistory';
import TaskFeedback from '../../components/taskFeedback/TaskFeedback';
import TaskDocumentEditor from '../../components/taskDocumentEditor/TaskDocumentEditor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HiOutlinePaperClip } from 'react-icons/hi2';
import { MessageSquareText, ShieldCheck, UserRound } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TbFiles } from 'react-icons/tb';
import { PiBoxArrowDownFill } from 'react-icons/pi';

import {
  FeedbackType,
  TaskPermission,
  TaskStatus,
  taskLoaderText,
} from '../../../../models/definitiosProject';
import useAssignUserTask from '../../hooks/useAssignUserTask';
import useReviewTask from '../../hooks/useReviewTask';
import useSendToReview from '../../hooks/useSendToReview';
import { TaskContext } from '../../components/taskCard/TaskCard';
import type { UserSelect } from '@/pages/specialities/models/taskGroupUser.types';
import type { FileTask, User } from '@/types/types';
import { COLOR_CSS } from '@/utils/cssData';
import { axiosInstance } from '@/services/axiosInstance';
import { downloadBlob } from '@/utils/tools';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import { useTaskWorkspacePanels } from '@/pages/specialities/contexts/TaskWorkspacePanelsContext';

const toUserSelect = (user: User): UserSelect => ({
  id: user.id,
  value: String(user.id),
  label: `${user.profile.firstName} ${user.profile.lastName}`,
  description: '',
  dni: user.profile.dni,
});

const withoutDuplicates = (users: UserSelect[]) =>
  users.filter(
    (user, index) => users.findIndex(item => item.id === user.id) === index
  );

const TaskPrincipal = () => {
  const {
    task,
    viewHistory,
    hasPermission,
    modInCharge,
    assignmentContextQuery,
    userInCharge,
    handleSetPercentage,
    percentage,
    userSession,
    service,
    isUserAndMod,
  } = useContext(TaskContext);
  const {
    showEditor,
    showTaskDetails,
    showBlankPanel,
    openedEditableFile,
    openEditableFile: openWorkspaceEditableFile,
  } = useTaskWorkspacePanels();

  const [showAllEvaluators, setShowAllEvaluators] = useState(false);
  const assignmentContext = assignmentContextQuery.data;
  const userOption = withoutDuplicates([
    ...(showAllEvaluators
      ? assignmentContext?.allActiveUsers ?? []
      : assignmentContext?.evaluators ?? []),
    ...(modInCharge ? [toUserSelect(modInCharge)] : []),
  ]);

  const {
    onAssignUser,
    assignedUser,
    onChangeAssignedUser,
    onChangeModerator,
  } = useAssignUserTask();

  const { feedback, onChangeFeedBack, reviewTask } = useReviewTask();
  const { sendToReview, setReviewFiles, reviewFiles } = useSendToReview();

  const openEditableFile = useCallback(
    (file: FileTask) => {
      openWorkspaceEditableFile(task.id, file);
    },
    [openWorkspaceEditableFile, task.id]
  );

  const taskEditableFile =
    openedEditableFile?.taskId === task.id ? openedEditableFile.file : null;
  const taskDocumentName = `${task.item ?? ''} ${task.name}`.trim();

  const modelFilesControl = (
    <Popover>
      <PopoverTrigger asChild>
        <AppButton size="xs" variant="ghost" className="max-w-full gap-1">
          <HiOutlinePaperClip aria-hidden="true" />
          <span className="truncate">Archivos modelos</span>
        </AppButton>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-80 p-3">
        <TaskCardUpload typeFile="MODEL" label="Archivos modelos" />
      </PopoverContent>
    </Popover>
  );

  const getUserInCharge = useCallback(() => {
    const userSessionSelect: UserSelect[] = [];
    if (userSession) {
      userSessionSelect.push(toUserSelect(userSession));
    }
    if (userInCharge && userSession.id !== userInCharge.id) {
      userSessionSelect.push(toUserSelect(userInCharge));
    }
    const unitMembers =
      assignmentContext?.members.filter(
        el => el.id !== userSession?.id && el.id !== userInCharge?.id
      ) ?? [];
    return [...(userSessionSelect ? userSessionSelect : []), ...unitMembers];
  }, [assignmentContext?.members, userInCharge, userSession]);

  const downloadAllFiles = async () => {
    const response = await axiosInstance.get(`download/task/${task.id}`, {
      responseType: 'blob',
    });
    downloadBlob(response.data, response.headers['file-name']);
  };

  const assignmentControls = (
    <div className="flex min-w-0 items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <AppButton size="xs" variant="ghost" className="gap-1">
            <UserRound aria-hidden="true" />
            Encargado
          </AppButton>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-80 p-3">
          <div className="flex items-end gap-3">
            <TaskCardSelect
              key={userInCharge?.id ?? 0}
              idDefaultValue={userInCharge?.id}
              label="Encargado:"
              viewAssigned={hasPermission(TaskPermission.VIEW_ASSIGN_TASK)}
              onAssigned={() => onAssignUser(userSession.id, 'technicalId')}
              options={getUserInCharge()}
              onChange={option =>
                onChangeAssignedUser(option ? option.id : 0, 'technicalId')
              }
              isLoading={assignmentContextQuery.isLoading}
              isDisabled={!hasPermission(TaskPermission.ASSIGN_USER_TASK)}
            />
            {hasPermission(TaskPermission.VIEW_PERCENTAGE) && (
              <TaskInputPercentage
                value={percentage}
                onChange={handleSetPercentage}
                disabled={!hasPermission(TaskPermission.EDIT_PERCENTAGE)}
                minLimit={task.percentageWithoutActive}
              />
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <AppButton size="xs" variant="ghost" className="gap-1">
            <ShieldCheck aria-hidden="true" />
            Evaluador
          </AppButton>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-80 p-3">
          <div className="flex flex-col gap-2">
            <TaskCardSelect
              key={modInCharge?.id ?? 0}
              idDefaultValue={modInCharge?.id}
              label="Evaluador:"
              options={userOption}
              onChange={option =>
                onChangeModerator(
                  option ? option.id : 0,
                  'evaluatorId',
                  modInCharge?.id
                )
              }
              isLoading={assignmentContextQuery.isLoading}
              isDisabled={!hasPermission(TaskPermission.ASSIGN_EVALUATOR_TASK)}
            />
            {!showAllEvaluators &&
              assignmentContext &&
              assignmentContext.allActiveUsers.length >
                assignmentContext.evaluators.length &&
              hasPermission(TaskPermission.ASSIGN_EVALUATOR_TASK) && (
                <button
                  type="button"
                  className="text-xs text-blue-700 underline-offset-2 hover:underline"
                  onClick={() => setShowAllEvaluators(true)}
                >
                  Ver todos los usuarios activos
                </button>
              )}
            {showAllEvaluators && (
              <button
                type="button"
                className="text-xs text-slate-600 underline-offset-2 hover:underline"
                onClick={() => setShowAllEvaluators(false)}
              >
                Mostrar solo evaluadores de la unidad
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {hasPermission(TaskPermission.VIEW_INPUT_FEEDBACK) && (
        <Popover>
          <PopoverTrigger asChild>
            <AppButton size="xs" variant="ghost" className="gap-1">
              <MessageSquareText aria-hidden="true" />
              Comentario
            </AppButton>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80 p-3">
            <TaskFeedback
              feedback={feedback}
              onChangeFeedBack={onChangeFeedBack}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

  const reviewControls = (
    <div className="flex shrink-0 items-center gap-1">
      {hasPermission(TaskPermission.ASSIGN_USER_TASK) &&
        task.status === TaskStatus.UNRESOLVED && (
          <AppButton
            size="xs"
            disabled={!assignedUser.technicalId}
            onClick={() =>
              onAssignUser(assignedUser.technicalId, 'technicalId')
            }
          >
            Continuar
          </AppButton>
        )}
      {hasPermission(TaskPermission.SEND_FOR_REVIEW) && (
        <AppButton size="xs" onClick={sendToReview}>
          Mandar a revisar
        </AppButton>
      )}
    </div>
  );

  const editorHeaderContent = (leadingContent?: ReactNode) => (
    <div className="flex w-full min-w-0 items-center gap-1">
      {leadingContent}
      {modelFilesControl}
      {assignmentControls}
      {reviewControls}
      <div className="ml-auto">
        <TaskCardHeader showTitle={false} />
      </div>
    </div>
  );

  const editorPanel = (
    <div className="task-panel-left h-full w-full">
      {viewHistory ? (
        <div className="task-document-editor">
          <div className="task-document-editor__header">
            <div className="text-xs font-semibold">Historial de la tarea</div>
            <div />
            <div className="task-document-editor__header-content">
              <TaskCardHeader showTitle={false} />
            </div>
          </div>
          <TaskHistory />
        </div>
      ) : (
        <TaskDocumentEditor
          key={`${service.modalTask}-${task.id}`}
          taskId={task.id}
          taskKind={service.modalTask}
          taskName={taskDocumentName}
          sourceFile={taskEditableFile}
          headerContent={editorHeaderContent()}
        />
      )}
    </div>
  );

  const taskDetailsPanel = (
    <div className="h-full min-h-0 w-full bg-background">
      <PanelGroup direction="horizontal" className="h-full min-h-0">
        <Panel
          defaultSize={65}
          minSize={45}
          order={1}
          className="task-left min-h-0"
        >
          <div className="min-h-0 flex-1 overflow-auto">
            <TaskCardHeader />
            {viewHistory ? (
              <TaskHistory />
            ) : (
              <div className="task-left-contain">
                <div className="task-dhyrium-contain">
                  {hasPermission(TaskPermission.VIEW_DELIVERABLES) && (
                    <div className="task-upload-contain">
                      <DivFlex
                        flexDirection="column"
                        gap={0.2}
                        alignItems="flex-start"
                      >
                        <DivFlex justifyContent="space-between">
                          <h2 className="task-label">
                            <TbFiles size={21} color="black" />
                            Entregables
                          </h2>
                          {hasPermission(TaskPermission.DOWNLOAD_ALL_FILES) && (
                            <AppButton
                              size="icon-xs"
                              variant="ghost"
                              aria-label="Descargar todos los entregables"
                              title="Descargar todos"
                              onClick={downloadAllFiles}
                            >
                              <PiBoxArrowDownFill
                                size={21}
                                color={COLOR_CSS.secondary}
                              />
                            </AppButton>
                          )}
                        </DivFlex>
                        {task.lastFeedback?.createdAt && (
                          <span className="task-label-span">
                            Enviados el{' '}
                            {formatDayDateTimeUtc(task.lastFeedback.createdAt)}
                          </span>
                        )}
                      </DivFlex>
                      {hasPermission(
                        TaskPermission.DELETE_UPLOAD_DELIVERABLES
                      ) ? (
                        <TaskCardUploadNormal
                          onChange={setReviewFiles}
                          value={reviewFiles}
                        />
                      ) : (
                        <SubtaskFile
                          files={task.lastFeedback.files}
                          direction="column"
                          onOpenEditable={openEditableFile}
                        />
                      )}
                    </div>
                  )}
                  {hasPermission(TaskPermission.VIEW_LOADER) &&
                    !isUserAndMod && (
                      <LoaderText
                        text={taskLoaderText[task.status] || ''}
                        className="loader-deliverables"
                      />
                    )}
                  {task.status === TaskStatus.UNRESOLVED && (
                    <div className="task-dhyrium">
                      <figure className="task-dhyrium-figure">
                        <img src="/img/DHYRIUM-gray.png" alt="" />
                      </figure>
                      <span className="task-dhyrium-text">DHYRIUM</span>
                    </div>
                  )}
                </div>

                <div className="task-left">
                  {assignmentContext?.migrationRequired && (
                    <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Esta etapa aun usa su grupo anterior. Asigne una unidad en
                      los datos de la etapa para migrar sus nuevos responsables.
                    </p>
                  )}
                  <div className="flex items-end gap-4">
                    <TaskCardSelect
                      key={userInCharge?.id ?? 0}
                      idDefaultValue={userInCharge?.id}
                      label="Encargado:"
                      viewAssigned={hasPermission(
                        TaskPermission.VIEW_ASSIGN_TASK
                      )}
                      onAssigned={() =>
                        onAssignUser(userSession.id, 'technicalId')
                      }
                      options={getUserInCharge()}
                      onChange={option =>
                        onChangeAssignedUser(
                          option ? option.id : 0,
                          'technicalId'
                        )
                      }
                      isLoading={assignmentContextQuery.isLoading}
                      isDisabled={
                        !hasPermission(TaskPermission.ASSIGN_USER_TASK)
                      }
                    />
                    {hasPermission(TaskPermission.VIEW_PERCENTAGE) && (
                      <TaskInputPercentage
                        value={percentage}
                        onChange={handleSetPercentage}
                        disabled={
                          !hasPermission(TaskPermission.EDIT_PERCENTAGE)
                        }
                        minLimit={task.percentageWithoutActive}
                      />
                    )}
                  </div>
                  <TaskCardSelect
                    key={modInCharge?.id ?? 0}
                    idDefaultValue={modInCharge?.id}
                    label="Evaluador:"
                    options={userOption}
                    onChange={option =>
                      onChangeModerator(
                        option ? option.id : 0,
                        'evaluatorId',
                        modInCharge?.id
                      )
                    }
                    isLoading={assignmentContextQuery.isLoading}
                    isDisabled={
                      !hasPermission(TaskPermission.ASSIGN_EVALUATOR_TASK)
                    }
                  />
                  {!showAllEvaluators &&
                    assignmentContext &&
                    assignmentContext.allActiveUsers.length >
                      assignmentContext.evaluators.length &&
                    hasPermission(TaskPermission.ASSIGN_EVALUATOR_TASK) && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-blue-700 underline-offset-2 hover:underline"
                        onClick={() => setShowAllEvaluators(true)}
                      >
                        Ver todos los usuarios activos
                      </button>
                    )}
                  {showAllEvaluators && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-slate-600 underline-offset-2 hover:underline"
                      onClick={() => setShowAllEvaluators(false)}
                    >
                      Mostrar solo evaluadores de la unidad
                    </button>
                  )}
                  {hasPermission(TaskPermission.VIEW_INPUT_FEEDBACK) && (
                    <TaskFeedback
                      feedback={feedback}
                      onChangeFeedBack={onChangeFeedBack}
                    />
                  )}
                  {hasPermission(TaskPermission.VIEW_INFO_FEEDBACK) && (
                    <TaskFeedbackInfo />
                  )}
                </div>
              </div>
            )}
          </div>

          {!viewHistory && (
            <div className="task-left-btns mt-2 items-center justify-between gap-2">
              <div>
                {hasPermission(TaskPermission.REJECT_TASKS) && (
                  <AppButton
                    size="sm"
                    variant="outline"
                    onClick={() => reviewTask(FeedbackType.REJECTED)}
                  >
                    Corregir
                  </AppButton>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasPermission(TaskPermission.ASSIGN_USER_TASK) &&
                  task.status === TaskStatus.UNRESOLVED && (
                    <AppButton
                      size="sm"
                      disabled={!assignedUser.technicalId}
                      onClick={() =>
                        onAssignUser(assignedUser.technicalId, 'technicalId')
                      }
                    >
                      Continuar
                    </AppButton>
                  )}
                {hasPermission(TaskPermission.SEND_FOR_REVIEW) && (
                  <AppButton size="sm" onClick={sendToReview}>
                    Mandar a revisar
                  </AppButton>
                )}
                {hasPermission(TaskPermission.REVIEW_TASKS) && (
                  <AppButton
                    size="sm"
                    onClick={() => reviewTask(FeedbackType.ACCEPTED)}
                  >
                    Revisado
                  </AppButton>
                )}
              </div>
            </div>
          )}
        </Panel>

        <PanelResizeHandle
          className="group flex w-2 cursor-col-resize items-center justify-center border-x border-border bg-muted/70 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cambiar el ancho del detalle de la tarea"
        >
          <span className="h-14 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
        </PanelResizeHandle>

        <Panel
          defaultSize={35}
          minSize={20}
          order={2}
          className="task-right min-h-0 overflow-auto"
        >
          <TaskCardInfo />
          <TaskCardUpload typeFile="MODEL" label="Archivos modelos" />
        </Panel>
      </PanelGroup>
    </div>
  );

  const blankPanel = (
    <div
      className="h-full min-h-0 w-full bg-background"
      aria-label="Panel 5 en blanco"
    />
  );
  const visiblePanels: Array<{
    id: 3 | 4 | 5;
    content: ReactNode;
  }> = [];

  if (showEditor) visiblePanels.push({ id: 3, content: editorPanel });
  if (showTaskDetails) {
    visiblePanels.push({ id: 4, content: taskDetailsPanel });
  }
  if (showBlankPanel) visiblePanels.push({ id: 5, content: blankPanel });

  if (!visiblePanels.length) return null;
  if (visiblePanels.length === 1) return visiblePanels[0].content;

  const panelSize = 100 / visiblePanels.length;

  return (
    <PanelGroup
      autoSaveId={`task-lower-panels-${service.modalTask}-${visiblePanels
        .map(panel => panel.id)
        .join('-')}`}
      direction="horizontal"
      className="h-full min-h-0 w-full"
    >
      {visiblePanels.map((visiblePanel, index) => (
        <Fragment key={visiblePanel.id}>
          {index > 0 && (
            <PanelResizeHandle
              className="group flex w-2 cursor-col-resize items-center justify-center border-x border-border bg-muted/70 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Cambiar el ancho del panel ${visiblePanel.id}`}
            >
              <span className="h-14 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
            </PanelResizeHandle>
          )}
          <Panel
            defaultSize={panelSize}
            minSize={15}
            order={index + 1}
            className="min-h-0 min-w-0"
          >
            {visiblePanel.content}
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  );
};

export default TaskPrincipal;
