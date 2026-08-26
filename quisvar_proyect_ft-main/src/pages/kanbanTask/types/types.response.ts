export type KanbanTaskRes = {
  id: number;
  date: Date | string;
  title: string;
  isActive: boolean;
  tasks: TaskRes[];
};
export type TaskRes = {
  id: number;
  date?: number;
  createdAt: Date | string;
  description: string;
  name: string;
  projectName: string | null;
  order?: number;
};
export type ItemsRes = {
  id: number;
  description: string;
  price: number;
  taskId: number;
  files: KtaskFileRes[];
};
export type KtaskFileRes = {
  id: number;
  name: string;
  author: string;
  originalname: string;
  dir: string;
  itemId: number;
};
