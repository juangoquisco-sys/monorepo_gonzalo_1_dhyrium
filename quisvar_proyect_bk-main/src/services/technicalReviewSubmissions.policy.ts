import AppError from '@/utils/appError';

export type TechnicalReviewSubmissionState =
  | 'PENDING'
  | 'REPLACED'
  | 'APPROVED'
  | 'OBSERVED';

export const resolveTechnicalReviewSubmissionState = (submission: {
  replacedAt: Date | null;
  status: boolean;
  type: string;
}): TechnicalReviewSubmissionState => {
  if (submission.replacedAt) return 'REPLACED';
  if (!submission.status) return 'PENDING';
  return submission.type === 'ACCEPTED' ? 'APPROVED' : 'OBSERVED';
};

export const assertNextTechnicalReviewPercentage = (
  percentage: number,
  pendingPercentage: number
) => {
  if (!Number.isInteger(percentage))
    throw new AppError('El porcentaje debe ser un numero entero', 400);
  if (percentage <= 0 || percentage > 100)
    throw new AppError('El porcentaje debe estar entre 1 y 100', 400);
  if (percentage <= pendingPercentage)
    throw new AppError(
      `El nuevo avance debe ser mayor a ${pendingPercentage}%`,
      400
    );
};
