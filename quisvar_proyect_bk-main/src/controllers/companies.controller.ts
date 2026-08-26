import { Request, Response } from 'express';
import CompaniesServices from '@/services/companies.services';
import { FilesProps } from '@/types/types';
import AppError from '@/utils/appError';
// import { unlinkSync } from 'fs';

class CompanyController {
  public static async updateImg(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!req.file) throw new AppError('No existe imagen', 400);
    const { filename } = req.file as Express.Multer.File;
    const image = filename;
    const query = await CompaniesServices.updateImg(image, +id);
    res.status(200).json(query);
  }

  public static async deleteImg(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const query = await CompaniesServices.deleteImg(+id);
    res.status(200).json(query);
  }
}
export default CompanyController;

export const createCompany = async (req: Request, res: Response) => {
  const { body } = req;
  const { img } = req.files as FilesProps;
  const query = await CompaniesServices.createCompany({
    ...body,
    img: img ? img[0].filename : '',
  });
  res.status(201).json(query);
};

export const getCompany = async (req: Request, res: Response) => {
  const query = await CompaniesServices.getCompanies(
    req.query.source === 'contracts'
  );
  res.status(200).json(query);
};
export const getCompaniesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await CompaniesServices.getCompaniesById(+id);
  res.status(200).json(query);
};
export const updateCompaniesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  const query = await CompaniesServices.updateCompaniesById(+id, body);
  res.status(200).json(query);
};
export const updateCompanieInvoiceById = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const body = { ...req.body, id: +id };
  const query = await CompaniesServices.updateCompanieInvoiceById(body);
  res.status(200).json(query);
};
//COMPANIES IMG
