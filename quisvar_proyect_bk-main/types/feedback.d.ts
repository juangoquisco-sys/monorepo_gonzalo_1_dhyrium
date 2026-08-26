import type { Feedback } from '@prisma/client';
import type { FilesType } from '@/types/task';

export interface CreateFeedbackForm
  extends Pick<Feedback, 'subTasksId' | 'percentage'> {
  files: FilesType[];
  userOnTaskId: number;
}

export interface ReviewFeedbackForm
  extends Pick<Feedback, 'id' | 'type' | 'comment' | 'percentage'> {
  userOnTaskId: number;
}
