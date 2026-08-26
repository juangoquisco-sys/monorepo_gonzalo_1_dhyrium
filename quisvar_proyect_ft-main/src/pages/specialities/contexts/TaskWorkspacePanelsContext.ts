import { createContext, useContext } from 'react';
import type { FileTask } from '@/types/types';

export type TaskWorkspaceLowerPanel = 3 | 4 | 5;

interface OpenedEditableFile {
  taskId: number;
  file: FileTask;
}

interface TaskWorkspacePanelsContextValue {
  showEditor: boolean;
  showTaskDetails: boolean;
  showBlankPanel: boolean;
  activateLowerPanel: (panel: TaskWorkspaceLowerPanel) => void;
  openedEditableFile: OpenedEditableFile | null;
  openEditableFile: (taskId: number, file: FileTask) => void;
}

export const TaskWorkspacePanelsContext =
  createContext<TaskWorkspacePanelsContextValue>({
    showEditor: true,
    showTaskDetails: false,
    showBlankPanel: false,
    activateLowerPanel: () => undefined,
    openedEditableFile: null,
    openEditableFile: () => undefined,
  });

export const useTaskWorkspacePanels = () =>
  useContext(TaskWorkspacePanelsContext);
