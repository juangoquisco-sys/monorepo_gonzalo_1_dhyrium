import { NextFunction, Request, Response } from 'express';
import AreaSpecialtyListServices from '@/services/areaSpecialtyList.services';
export const createAreaSpecialtyList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body } = req;
    const { specialtyId } = req.params;
    const query = await AreaSpecialtyListServices.createAreaSpecialtyList(
      body,
      +specialtyId
    );
    res.status(201).json(query);
  } catch (error) {
    console.log(error);

    next(error);
  }
};
export const getAreaSpecialtyList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await AreaSpecialtyListServices.getAreaSpecialtyList(+id);
  res.status(200).json(query);
};
// export const getAllSpecialistBySpeciality = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const query = await AreaSpecialtyListServices.getAllSpecialistBySpeciality(
//       +id
//     );
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };
// export const updateAreaSpecialtyList = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const { specialtyName } = req.body;
//     const query = await AreaSpecialtyListServices.updateAreaSpecialtyList(
//       +id,
//       specialtyName
//     );
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };
export const deleteAreaSpecialtyList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await AreaSpecialtyListServices.deleteAreaSpecialtyList(+id);
  res.status(200).json(query);
};
