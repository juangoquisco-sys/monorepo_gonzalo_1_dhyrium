import type { TypeTask } from '@/types/task.types';
export const INITIAL_VALUES_EDIT = {
  isEdit: false,
};
export const PROJECT_OPTIONS = [
  {
    id: 1,
    text: 'DATOS GENERALES',
    iconOn: 'ntbook-blue',
    iconOff: 'ntbook-black',
    navigation: 'detalles',
  },
  {
    id: 2,
    text: 'HOJA DE PRESUPUESTOS',
    iconOn: 'spread-blue',
    iconOff: 'spread-black',
    navigation: 'presupuestos',
  },
  {
    id: 3,
    text: 'BÁSICOS',
    iconOn: 'brief-blue',
    iconOff: 'brief-black',
    navigation: 'basicos',
  },
];

export const OPTION_PROJECT = {
  basic: {
    modalTask: 'basictasks' as TypeTask,
    addLevel: 'client:basic-add-level',
    deleteLevel: 'client:basic-delete-level',
    editLevel: 'client:basic-edit-level',
    makeRegularLevel: 'client:basic-make-regular-level',
    duplicateLevel: 'client:basic-duplicates-level',
    upperOrLowerLevel: 'client:basic-upper-or-lower-level',
    loadTask: 'client:load-basic-task',
    addTask: 'client:add-task-basic',
    editTask: 'client:edit-task-basic',
    deleteTask: 'client:delete-task-basic',
    dupplicateTask: 'client:duplicate-task-basic',
    addUppeOrLowerTask: 'client:upper-or-lower-task-basic',
    uploadFile: '/files/basics',
    updateDay: 'client:update-task-days-basic',
    updateCover: 'client:update-cover-basic',
    resetTask: 'client:restore-basic-task',
    getFeedbackTask: '/feedbacks/basic-task',
    archiver: '/download/basic-',
    mergePdfs: '/merge-basic-',
    sortTask: 'client:sort-task-basic',
    addUserTask: 'client:add-user-basic-task',
    changeUserTask: 'client:change-user-basic-task',
    addModTask: 'client:add-mod-basic-task',
    removeModTask: 'client:remove-mod-basic-task',
    reviewTask: 'client:review-basic-task',
    feedbackTask: '/feedbacks/basic-task',
  },
  budget: {
    modalTask: 'subtasks' as TypeTask,
    addLevel: 'client:budget-add-level',
    deleteLevel: 'client:budget-delete-level',
    editLevel: 'client:budget-edit-level',
    makeRegularLevel: 'client:budget-make-regular-level',
    duplicateLevel: 'client:budget-duplicates-level',
    upperOrLowerLevel: 'client:budget-upper-or-lower-level',
    loadTask: 'client:load-budget-task',
    addTask: 'client:add-task-budget',
    editTask: 'client:edit-task-budget',
    deleteTask: 'client:delete-task-budget',
    dupplicateTask: 'client:duplicate-task-budget',
    addUppeOrLowerTask: 'client:upper-or-lower-task-budget',
    uploadFile: '/files/uploads',
    updateDay: 'client:update-task-days-budget',
    updateCover: 'client:update-cover-budget',
    resetTask: 'client:restore-budget-task',
    getFeedbackTask: '/feedbacks/task',
    archiver: '/download/',
    mergePdfs: '/download/merge-',
    sortTask: 'client:sort-task-budget',
    addUserTask: 'client:add-user-budget-task',
    changeUserTask: 'client:change-user-budget-task',
    addModTask: 'client:add-mod-budget-task',
    removeModTask: 'client:remove-mod-budget-task',
    reviewTask: 'client:review-budget-task',
    feedbackTask: '/feedbacks/task',
  },
} as const;

export enum ProjectRole {
  MODERATOR = 'MODERATOR',
  USER = 'USER',
}

export enum TaskRole {
  EVALUADOR = 'EVALUADOR',
  TECNICO = 'TECNICO',
  VIZUALIZADOR = 'VIZUALIZADOR',
}

export enum TaskPermission {
  DELETE_UPLOAD_MODELS = 'DELETE_UPLOAD_MODELS',
  VIEW_ASSIGN_TASK = 'VIEW_ASSIGN_TASK',
  ASSIGN_USER_TASK = 'ASSIGN_USER_TASK',
  ASSIGN_EVALUATOR_TASK = 'ASSIGN_EVALUATOR_TASK',
  RESET_TASK = 'RESET_TASK',
  VIEW_DELIVERABLES = 'VIEW_DELIVERABLES',
  DELETE_UPLOAD_DELIVERABLES = 'DELETE_UPLOAD_DELIVERABLES',
  SEND_FOR_REVIEW = 'SEND_FOR_REVIEW',
  VIEW_LOADER = 'VIEW_LOADER',
  VIEW_PERCENTAGE = 'VIEW_PERCENTAGE',
  EDIT_PERCENTAGE = 'EDIT_PERCENTAGE',
  REVIEW_TASKS = 'REVIEW_TASKS',
  REJECT_TASKS = 'REJECT_TASKS',
  VIEW_INPUT_FEEDBACK = 'VIEW_INPUT_FEEDBACK',
  VIEW_INFO_FEEDBACK = 'VIEW_INFO_FEEDBACK',
  DOWNLOAD_ALL_FILES = 'DOWNLOAD_ALL_FILES',

  SUBMIT_TASKS = 'SUBMIT_TASKS',
  VIEW_SUBMITTALS = 'VIEW_SUBMITTALS',
  UPLOAD_SUBMITTALS = 'UPLOAD_SUBMITTALS',
  VIEW_MODELS = 'VIEW_MODELS',
  VIEW_PROGRESS = 'VIEW_PROGRESS',
  INTERACT_WITH_PROGRESS = 'INTERACT_WITH_PROGRESS',
  CORRECT = 'CORRECT',
  MARK_REVIEWED = 'MARK_REVIEWED',
}

export enum TaskStatus {
  UNRESOLVED = 'UNRESOLVED',
  PROCESS = 'PROCESS',
  INREVIEW = 'INREVIEW',
  DENIED = 'DENIED',
  REVIEWED = 'REVIEWED',
  DONE = 'DONE',
  LIQUIDATION = 'LIQUIDATION',
}

const {
  DELETE_UPLOAD_MODELS,
  VIEW_ASSIGN_TASK,
  ASSIGN_USER_TASK,
  RESET_TASK,
  ASSIGN_EVALUATOR_TASK,
  DELETE_UPLOAD_DELIVERABLES,
  VIEW_DELIVERABLES,
  SEND_FOR_REVIEW,
  VIEW_LOADER,
  VIEW_PERCENTAGE,
  EDIT_PERCENTAGE,
  REVIEW_TASKS,
  VIEW_INPUT_FEEDBACK,
  VIEW_INFO_FEEDBACK,
  REJECT_TASKS,
  DOWNLOAD_ALL_FILES,
} = TaskPermission;

export enum FeedbackType {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  HOLDING = 'HOLDING',
}

export const taskLoaderText: Partial<Record<TaskStatus, string>> = {
  [TaskStatus.PROCESS]: 'Esperando entregables...',
  [TaskStatus.REVIEWED]: 'Finalización en proceso',
  [TaskStatus.DENIED]: 'Esperando corrección...',
  [TaskStatus.INREVIEW]: 'Revisión en proceso...',
};

export const taskRolePermissions: Record<
  TaskRole,
  Partial<Record<TaskStatus, TaskPermission[]>>
> = {
  [TaskRole.VIZUALIZADOR]: {},
  [TaskRole.EVALUADOR]: {
    [TaskStatus.UNRESOLVED]: [
      DELETE_UPLOAD_MODELS,
      VIEW_ASSIGN_TASK,
      RESET_TASK,
      ASSIGN_USER_TASK,
      ASSIGN_EVALUATOR_TASK,
    ],
    [TaskStatus.PROCESS]: [
      DELETE_UPLOAD_MODELS,
      RESET_TASK,
      ASSIGN_EVALUATOR_TASK,
      VIEW_LOADER,
      ASSIGN_USER_TASK,
    ],
    [TaskStatus.INREVIEW]: [
      DELETE_UPLOAD_MODELS,
      RESET_TASK,
      ASSIGN_EVALUATOR_TASK,
      VIEW_PERCENTAGE,
      EDIT_PERCENTAGE,
      REVIEW_TASKS,
      REJECT_TASKS,
      VIEW_DELIVERABLES,
      VIEW_INPUT_FEEDBACK,
      ASSIGN_USER_TASK,
      DOWNLOAD_ALL_FILES,
    ],
    [TaskStatus.DENIED]: [
      DELETE_UPLOAD_MODELS,
      RESET_TASK,
      ASSIGN_EVALUATOR_TASK,
      VIEW_LOADER,
      VIEW_INFO_FEEDBACK,
      ASSIGN_USER_TASK,
    ],
    [TaskStatus.REVIEWED]: [
      DELETE_UPLOAD_MODELS,
      RESET_TASK,
      ASSIGN_EVALUATOR_TASK,
      VIEW_LOADER,
      VIEW_INFO_FEEDBACK,
      ASSIGN_USER_TASK,
    ],
  },
  [TaskRole.TECNICO]: {
    [TaskStatus.UNRESOLVED]: [VIEW_ASSIGN_TASK],
    [TaskStatus.PROCESS]: [
      DELETE_UPLOAD_DELIVERABLES,
      VIEW_DELIVERABLES,
      SEND_FOR_REVIEW,
      VIEW_PERCENTAGE,
      EDIT_PERCENTAGE,
    ],
    [TaskStatus.INREVIEW]: [
      VIEW_LOADER,
      VIEW_PERCENTAGE,
      VIEW_DELIVERABLES,
      REJECT_TASKS,
    ],
    [TaskStatus.DENIED]: [
      DELETE_UPLOAD_DELIVERABLES,
      VIEW_DELIVERABLES,
      SEND_FOR_REVIEW,
      VIEW_PERCENTAGE,
      EDIT_PERCENTAGE,
      VIEW_INFO_FEEDBACK,
    ],
    [TaskStatus.REVIEWED]: [
      DELETE_UPLOAD_DELIVERABLES,
      VIEW_DELIVERABLES,
      SEND_FOR_REVIEW,
      VIEW_PERCENTAGE,
      EDIT_PERCENTAGE,
      VIEW_INFO_FEEDBACK,
    ],
  },
  // [TaskRole.TECNICO]: [TaskPermission.SUBMIT_TASKS],
};
