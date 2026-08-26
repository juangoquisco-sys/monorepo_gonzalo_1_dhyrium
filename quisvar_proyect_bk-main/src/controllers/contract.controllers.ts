import { Request, Response } from 'express';
import ContractServices from '@/services/contract.services';
import { _contractPath } from '@/services/paths.services';
import { existsSync, renameSync, rmSync } from 'fs';
import AppError from '@/utils/appError';
import { ContractForm } from '@/types/types';

class ContractController {
  static INIT_VALUES_PHASE = {
    name: '',
    days: 0,
    isActive: false,
    id: new Date().getTime(),
  };

  public static async showContracts(req: Request, res: Response) {
    const cui = req.query.cui as string;
    const date = req.query.date as string;
    const type = req.query.type as ContractForm['type'];
    const company = req.query.companyId as string;
    const consortium = req.query.consortiumId as string;
    const compId = company ? parseInt(company) : undefined;
    const consortId = consortium ? parseInt(consortium) : undefined;
    const result = await ContractServices.showAll(
      cui,
      compId,
      consortId,
      type,
      date
    );
    res.status(200).json(result);
  }

  public static async showContract(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ContractServices.show(+id);
    res.status(200).json(result);
  }

  public static async lookupInvestmentByCui(req: Request, res: Response) {
    const { cui } = req.params;
    const result = await ContractServices.lookupInvestmentByCui(cui);
    res.status(200).json(result);
  }

  public static async createContract(req: Request, res: Response) {
    const { body } = req;
    const newBody = {
      ...body,
      phases: JSON.stringify([ContractController.INIT_VALUES_PHASE]),
    };
    const result = await ContractServices.create(newBody);
    res.status(201).json(result);
  }
  public static async createSpeciality(req: Request, res: Response) {
    const { listSpecialtiesId, contratcId } = req.body;
    const result = await ContractServices.createSpeciality(
      contratcId,
      listSpecialtiesId
    );
    res.status(201).json(result);
  }
  public static async addSpecialist(req: Request, res: Response) {
    const { contractSpecialtiesId, specialistsId } = req.body;
    const result = await ContractServices.addSpecialist(
      contractSpecialtiesId,
      specialistsId
    );
    res.status(200).json(result);
  }
  public static async deleteSpecialty(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ContractServices.deleteSpecialty(+id);
    res.status(200).json(result);
  }
  public static async getSpecialities(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ContractServices.getSpecialities(+id);
    res.status(200).json(result);
  }

  public static async updateContract(req: Request, res: Response) {
    const { body } = req;
    const { id } = req.params;
    const result = await ContractServices.update(+id, body);
    res.status(200).json(result);
  }

  public static async deleteContract(req: Request, res: Response) {
    const { id } = req.params;
    await ContractServices.delete(+id);
    res.status(204).send();
  }

  public static async uploadFiles(req: Request, res: Response) {
    const { fileName: newName } = req.body;
    const file = req.file;
    if (!file) throw new AppError('archivo no encontrado', 400);
    const { destination, filename, originalname } = file;
    const ext = originalname.split('.').at(-1);
    const olDir = destination + '/' + filename;
    const newDir = destination + '/' + newName + '.' + ext;
    renameSync(olDir, newDir);
    res.status(204).send();
  }

  public static async deleteFiles(req: Request, res: Response) {
    const { id } = req.params;
    const { filename } = req.query;
    const path = _contractPath + '/' + id + '/' + filename;
    if (!existsSync(path)) throw new AppError('El Archivo no existe', 404);
    rmSync(path);
    res.status(204).send();
  }

  public static async updateIndex(req: Request, res: Response) {
    const { id } = req.params;
    const { indexContract } = req.body;
    const result = await ContractServices.updateIndex(+id, indexContract);
    res.status(200).json(result);
  }

  public static async updateDetails(req: Request, res: Response) {
    const { id } = req.params;
    const { details } = req.body;
    const result = await ContractServices.updateDetails(+id, details);
    res.status(200).json(result);
  }
  public static async updateObservations(req: Request, res: Response) {
    const { id } = req.params;
    const { observations } = req.body;
    const result = await ContractServices.updateObservations(+id, observations);
    res.status(200).json(result);
  }

  public static async updatePhases(req: Request, res: Response) {
    const { id, isIndependent } = req.params;
    const { phases } = req.body;
    const result = await ContractServices.updatePhases(
      +id,
      phases,
      isIndependent
    );
    res.status(200).json(result);
  }
}
export default ContractController;
