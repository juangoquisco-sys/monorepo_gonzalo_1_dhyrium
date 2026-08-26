import { NextFunction, Request, Response } from 'express';
import ConsortiumServices from '@/services/consortium.services';
type FilesProps = { [fieldname: string]: Express.Multer.File[] };

export const createConsortium = async (req: Request, res: Response) => {
  const { body } = req;
  const { img } = req.files as FilesProps;
  const query = await ConsortiumServices.create({
    ...body,
    img: img ? img[0].filename : '',
  });
  res.status(201).json(query);
};
export const getAllConsortium = async (req: Request, res: Response) => {
  const query = await ConsortiumServices.getAllConsortium();
  res.status(200).json(query);
};
export const getConsortiumById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const query = await ConsortiumServices.getConsortiumById(+id);
    res.status(200).json(query);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export const updatePercentaje = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { consortiumId } = req.params;
    const data = req.body;
    const query = await ConsortiumServices.updatePercentaje(
      +consortiumId,
      data
    );
    res.status(200).json(query);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export const updateById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  const query = await ConsortiumServices.updateById(+id, body);
  res.status(200).json(query);
};
export const deleteById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await ConsortiumServices.deleteById(+id);
  res.status(200).json(query);
};
//CONSORTIUM IMG
export const updateImg = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { img } = req.files as FilesProps;
  const image = img ? img[0].filename : '';
  const query = await ConsortiumServices.updateImg(image, +id);
  res.status(200).json(query);
};
export const deleteImg = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await ConsortiumServices.deleteImg(+id);
  res.status(200).json(query);
};
//GET CONSORTIUM AND COMPANIES
export const getBoth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = await ConsortiumServices.getBoth();
    res.status(200).json(query);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
//CONSORTIUM RELATION
export const createRelationConsortium = async (req: Request, res: Response) => {
  const { companiesId, consortiumId } = req.params;
  const query = await ConsortiumServices.createRelation(
    +companiesId,
    +consortiumId
  );
  res.status(201).json(query);
};
export const deleteRelationConsortium = async (req: Request, res: Response) => {
  const { companiesId, consortiumId } = req.params;
  const query = await ConsortiumServices.deleteRelation(
    +companiesId,
    +consortiumId
  );
  res.status(200).json(query);
};
