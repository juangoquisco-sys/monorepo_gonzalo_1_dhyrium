import { NextFunction, Request, Response } from 'express';
import TrainingSpecialtyServices from '@/services/trainingSpecialty.services';
import AppError from '@/utils/appError';
import { z } from 'zod';
type FilesProps = { [fieldname: string]: Express.Multer.File[] };

const trainingSpecialtySchema = z.object({
  institution: z.string().trim().min(1, 'La institucion es obligatoria'),
  hours: z.string().trim().min(1, 'Las horas son obligatorias'),
  level: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO', 'ESPECIALISTA']),
  issue: z.string().optional(),
  startDate: z.string().optional(),
  untilDate: z.string().optional(),
  TrainingSpecialistNameId: z.coerce.number().int().positive(),
});
export const createTrainingSpecialty = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = trainingSpecialtySchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(parsed.error.issues[0]?.message ?? 'Datos invalidos', 400);
    const { trainingFile } = (req.files ?? {}) as FilesProps;
    const query = await TrainingSpecialtyServices.createTrainingSpecialty({
      ...parsed.data,
      trainingFile: trainingFile?.[0]?.filename ?? null,
    });
    res.status(201).json(query);
  } catch (error) {
    console.log(error);

    next(error);
  }
};
export const getTrainingSpecialty = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await TrainingSpecialtyServices.getTrainingSpecialty(+id);
  res.status(200).json(query);
};
export const updateTrainingSpecialty = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const parsed = trainingSpecialtySchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(parsed.error.issues[0]?.message ?? 'Datos invalidos', 400);
    const { trainingFile } = (req.files ?? {}) as FilesProps;
    const query = await TrainingSpecialtyServices.updateTrainingSpecialty(+id, {
      ...parsed.data,
      trainingFile: trainingFile?.[0]?.filename,
    });
    res.status(200).json(query);
  } catch (error) {
    next(error);
  }
};
export const deleteTrainingSpecialty = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await TrainingSpecialtyServices.deleteTrainingSpecialty(+id);
  res.status(200).json(query);
};
