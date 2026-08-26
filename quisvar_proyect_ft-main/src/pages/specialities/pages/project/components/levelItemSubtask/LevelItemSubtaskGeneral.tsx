import { NavLink, useNavigate, useParams } from 'react-router-dom';
import type { FileTask, Option, SubTask } from '@/types/types';
import { CSS } from '@dnd-kit/utilities';
import {
  useContext,
  useEffect,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import { SocketContext } from '@/context/SocketContex';
import { StatusText } from '../statusText/StatusText';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import DefaultUserImage from '@/components/defaultUserImage/DefaultUserImage';
import FloatingText from '@/components/floatingText/FloatingText';
import Input from '@/components/Input/Input';
import {
  isOpenButtonDelete$,
  isOpenCardRegisteTask$,
  loader$,
} from '@/services/sharingSubject';
import { useSortable } from '@dnd-kit/sortable';
import { ProjectContext } from '../../context/ProjectContext';
import { ProjectRole } from '../../models/definitiosProject';
import useInputFocus from '@/hooks/useInputFocus';
import {
  downloadHref,
  formatAmountMoneyPEN,
  formatTwoDecimals,
} from '@/utils/tools';
import { getParticipantSummary } from '../../utils/normalizeProjectLevel';
import { useTaskWorkspacePanels } from '@/pages/specialities/contexts/TaskWorkspacePanelsContext';
import {
  getTaskFileExtension,
  getTaskFileUrl,
  isEditableWordFile,
} from '../../pages/task/services/taskFile.service';

interface LevelItemSubtaskProps {
  subtask: SubTask;
  levelId: number;
  stayPrice?: number;
  handleDeleteTask?: (id: number) => void;
  isUnique?: boolean;
}

interface DeliverableFileRow {
  nativeFile?: FileTask;
  pdfFile?: FileTask;
}

const fileBaseName = (file: FileTask) =>
  (file.originalname || file.name)
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLocaleLowerCase();

const pairDeliverableFiles = (files: FileTask[]): DeliverableFileRow[] => {
  const pdfFiles = files.filter(file => getTaskFileExtension(file) === 'pdf');
  const usedPdfIds = new Set<number>();
  const rows: DeliverableFileRow[] = files
    .filter(file => getTaskFileExtension(file) !== 'pdf')
    .map(nativeFile => {
      const pdfFile = pdfFiles.find(
        file =>
          !usedPdfIds.has(file.id) &&
          fileBaseName(file) === fileBaseName(nativeFile)
      );
      if (pdfFile) usedPdfIds.add(pdfFile.id);
      return { nativeFile, pdfFile };
    });

  pdfFiles.forEach(pdfFile => {
    if (!usedPdfIds.has(pdfFile.id)) rows.push({ pdfFile });
  });
  return rows;
};

const fileIcon = (file: FileTask) => {
  const icons: Record<string, string> = {
    docx: 'word-icon',
    xlsx: 'excel-icon',
    pdf: 'pdf-icon',
    dwg: 'autocad-icon',
  };
  return icons[getTaskFileExtension(file)] ?? 'file-download';
};

const LevelItemSubtaskGeneral = ({
  subtask,
  levelId,
  handleDeleteTask,
  isUnique = false,
}: LevelItemSubtaskProps) => {
  const {
    dayTask,
    addDataTaskBody,
    service,
    hasPermission,
    ACTUAL_ROUTE,
    monthlyPrice,
  } = useContext(ProjectContext);
  const [numRowTask, setNumRowTask] = useState(0);
  const navigate = useNavigate();
  const { openEditableFile } = useTaskWorkspacePanels();
  const { getNewNumRowTask, handleKeyDown, onInputFocusRef } = useInputFocus();
  useEffect(() => {
    setNumRowTask(getNewNumRowTask());
  }, []);

  const priceDay = +(+monthlyPrice / 30).toFixed(4);

  const [data, setData] = useState({
    days: String(subtask.days),
    price: String(subtask.days),
  });

  useEffect(() => {
    const newPrice = +data.days * priceDay;
    setData({ ...data, price: newPrice.toFixed(2) });
  }, [monthlyPrice]);

  const socket = useContext(SocketContext);

  const { stageId } = useParams();

  const handleAddTaskToUpperOrDown = (
    subtask: SubTask,
    type: 'upper' | 'lower'
  ) => {
    isOpenCardRegisteTask$.setSubject = {
      isOpen: true,
      levelId,
      task: subtask,
      type,
    };
  };

  const handleEditTask = (subtask: SubTask) => {
    isOpenCardRegisteTask$.setSubject = {
      isOpen: true,
      levelId,
      task: subtask,
    };
  };

  const handleDuplicateTask = (subtask: SubTask) => {
    const body = {
      name: `${subtask.name}(${Date.now()})`,
      stageId,
      id: subtask.id,
    };
    loader$.setSubject = true;
    socket.emit(service.dupplicateTask, body, () => {
      loader$.setSubject = false;
    });
  };
  const handleOpenButtonDelete = (id: number) => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: () => handleDeleteTask?.(id),
    };
  };

  const onChangeText = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { value, name } = target;
    onAddDataBody(name, value);
  };

  const onAddDataBody = (name: string, value = '0') => {
    let days = '0';
    let price = '0';
    if (name === 'days') {
      const newPrice = +value * priceDay;
      days = value;
      price = newPrice.toFixed(2);
      addDataTaskBody?.({
        days: +value,
        price: +newPrice.toFixed(2),
        id: subtask.id,
      });
    }
    if (name === 'price') {
      const newdays = +value / priceDay;
      days = newdays.toFixed(4);
      price = value;
      addDataTaskBody?.({
        price: +value,
        days: +newdays.toFixed(4),
        id: subtask.id,
      });
    }
    setData({
      days,
      price,
    });
  };
  const onBlurText = ({ target }: FocusEvent<HTMLInputElement>) => {
    const { value, name } = target;
    onAddDataBody(name, value || '0');
  };
  useEffect(() => {
    setData({
      days: String(subtask.days),
      price: String(subtask.price),
    });
  }, [dayTask.isEdit]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: subtask.id,
    data: {
      type: 'Subtask',
      subtask,
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="levelSubtask-drag"></div>
    );
  }
  const participantSummary = getParticipantSummary(subtask);
  const deliverableFileRows = pairDeliverableFiles(
    subtask.feedBacks?.[0]?.files ?? []
  );
  const handleOpenEditableFile = (file: FileTask) => {
    openEditableFile(subtask.id, file);
    navigate(`tarea/${subtask.id}`, {
      state: { taskType: ACTUAL_ROUTE },
    });
  };
  const handleOpenTaskFile = (file: FileTask) => {
    if (isEditableWordFile(file)) {
      handleOpenEditableFile(file);
      return;
    }
    downloadHref(
      getTaskFileUrl(file),
      file.originalname || file.name,
      true
    );
  };
  const menuData: Option[] = [
    {
      name: 'Editar',
      icon: 'pencil',
      function: () => handleEditTask(subtask),
    },
    {
      name: 'Eliminar',
      icon: 'trash-red',
      function: () => handleOpenButtonDelete(subtask.id),
    },

    ...(!isUnique
      ? [
          {
            name: 'Duplicar',
            icon: 'document-duplicate',
            function: () => handleDuplicateTask(subtask),
          },
          {
            name: 'Agregar arriba',
            icon: 'upper',
            function: () => handleAddTaskToUpperOrDown(subtask, 'upper'),
          },
          {
            name: 'Agrega abajo',
            icon: 'lower',
            function: () => handleAddTaskToUpperOrDown(subtask, 'lower'),
          },
        ]
      : []),
  ];

  return (
    <div
      className={`levelSubtask-context-menu ${
        deliverableFileRows.length
          ? 'levelSubtask-context-menu--with-files'
          : ''
      }`}
      key={subtask.id}
      ref={setNodeRef}
      style={style}
      {...attributes}
      aria-disabled={undefined}
      {...listeners}
    >
      <AppContextMenu
        data={menuData}
        disabled={!hasPermission(ProjectRole.MODERATOR)}
      >
        <NavLink
          to={dayTask.isEdit || subtask.isFake ? '' : `tarea/${subtask.id}`}
          state={{ taskType: ACTUAL_ROUTE }}
          className={({ isActive }) =>
            `levelSubtask-content pointer ${
              isActive && 'levelSubtask-content-active'
            }`
          }
        >
          <div className="levelSubtask-item levelSubtask-item--name">
            <FloatingText
              text={subtask.item + ' ' + subtask.name}
              className="levelSubtask-text"
            >
              <div className="levelSubtask-text">
                {subtask.item}
                <span className="levelSubtask-text-name">{subtask.name}</span>
              </div>
            </FloatingText>
          </div>
          <div className="levelSubtask-item">
            {dayTask.isEdit ? (
              <div style={{ width: '3rem' }}>
                <div className="projectLevel-input-name">
                  <Input
                    onChange={onChangeText}
                    style={{
                      textAlign: 'center',
                    }}
                    type="number"
                    value={data.days}
                    data-col={0}
                    data-row={+numRowTask}
                    ref={onInputFocusRef}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlurText}
                    autoFocus
                    name="days"
                    styleInput={3}
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : (
              <div className="levelSubtask-text">
                {hasPermission(ProjectRole.MODERATOR)
                  ? formatTwoDecimals(subtask.days)
                  : '-'}
              </div>
            )}
          </div>
          <div className="levelSubtask-item">
            <div className="levelSubtask-text">
              {dayTask.isEdit ? priceDay : subtask.percentage + '%'}
            </div>
          </div>
          <div className="levelSubtask-item">
            {dayTask.isEdit ? (
              <div style={{ width: '3rem' }}>
                <div className="projectLevel-input-name">
                  <Input
                    onChange={onChangeText}
                    style={{
                      textAlign: 'center',
                    }}
                    type="number"
                    value={data.price}
                    autoFocus
                    // onKeyDown={pressKeydown}
                    data-col={1}
                    data-row={+numRowTask}
                    ref={onInputFocusRef}
                    onKeyDown={handleKeyDown}
                    name="price"
                    styleInput={3}
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : (
              <div className="levelSubtask-text">
                {hasPermission(ProjectRole.MODERATOR)
                  ? formatAmountMoneyPEN(+subtask.price)
                  : '-'}
              </div>
            )}
          </div>
          <div className="levelSubtask-item">
            <StatusText status={subtask.status} />
          </div>
          <div className="levelSubtask-item">
            {subtask.isFake && 'Cargando...'}
            <div className="levelSubtask-user-image">
              {participantSummary.length ? (
                participantSummary.map(user => (
                  <DefaultUserImage key={user.userId} user={user} />
                ))
              ) : (
                <div className="levelSubtask-text">No asignado aún</div>
              )}
            </div>
          </div>
        </NavLink>
        {deliverableFileRows.length > 0 && (
          <div
            className="levelSubtask-editable-files"
            aria-label={`Archivos entregables de ${subtask.name}`}
          >
            {deliverableFileRows.map(({ nativeFile, pdfFile }, index) => {
              const primaryFile = nativeFile ?? pdfFile;
              if (!primaryFile) return null;
              return (
                <div
                  key={`${primaryFile.id}-${pdfFile?.id ?? index}`}
                  className="levelSubtask-file-pair"
                >
                  <button
                    type="button"
                    className="levelSubtask-editable-file"
                    title={`Abrir ${primaryFile.originalname}`}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleOpenTaskFile(primaryFile);
                    }}
                    onPointerDown={event => event.stopPropagation()}
                  >
                    <img
                      src={`/svg/${fileIcon(primaryFile)}.svg`}
                      alt=""
                      aria-hidden="true"
                    />
                    <span>{primaryFile.originalname}</span>
                  </button>
                  {nativeFile && pdfFile && (
                    <button
                      type="button"
                      className="levelSubtask-pdf-file"
                      title={`Abrir ${pdfFile.originalname}`}
                      aria-label={`Abrir PDF ${pdfFile.originalname}`}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleOpenTaskFile(pdfFile);
                      }}
                      onPointerDown={event => event.stopPropagation()}
                    >
                      <img src="/svg/pdf-icon.svg" alt="" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AppContextMenu>
    </div>
  );
};

export default LevelItemSubtaskGeneral;
