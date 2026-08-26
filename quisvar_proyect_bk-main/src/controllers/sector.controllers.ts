import { Request, Response } from 'express';
import SectorServices from '@/services/sector.services';
import { UserType } from '@/middlewares/auth.middleware';
import { parseQueries } from '@/utils/format.server';
import { SectorQuery } from '@/services/sector.services';

export const showSectors = async (req: Request, res: Response) => {
  const { id: userId }: UserType = res.locals.userInfo;
  const queries = parseQueries<SectorQuery>(req.query);
  const result = await SectorServices.getAll(userId, queries);
  res.status(200).json(result);
};

// export const showSpeciality = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     try {
//       const { id } = req.params;
//       const project_id = parseInt(id);
//       const query = await SectorServices.find(project_id);
//       res.status(200).json(query);
//     } catch (error) {
//       next(error);
//     }
//   };

export const createSector = async (req: Request, res: Response) => {
  const { body } = req;
  const createNewProject = await SectorServices.create(body);
  res.status(201).json(createNewProject);
};

export const updateSector = async (req: Request, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const sector_id = parseInt(id);
  const query = await SectorServices.update(sector_id, body);
  res.status(200).json(query);
};

export const deleteSector = async (req: Request, res: Response) => {
  const { id } = req.params;
  const sector_id = parseInt(id);
  await SectorServices.delete(sector_id);
  res.status(204).send();
};
