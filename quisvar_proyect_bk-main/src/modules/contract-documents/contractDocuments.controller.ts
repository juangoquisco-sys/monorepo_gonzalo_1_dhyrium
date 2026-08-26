import { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import ContractDocumentsService from './contractDocuments.service';

const getUserId = (res: Response) => (res.locals.userInfo as UserType).id;

class ContractDocumentsController {
  static async scopes(_req: Request, res: Response) {
    res.status(200).json({
      scopes: await ContractDocumentsService.listScopes(),
    });
  }

  static async contracts(req: Request, res: Response) {
    res
      .status(200)
      .json(await ContractDocumentsService.listContracts(req.query));
  }

  static async count(req: Request, res: Response) {
    const result = await ContractDocumentsService.listContracts({
      ...req.query,
      page: 1,
      limit: 1,
    });
    res.status(200).json({ count: result.pagination.total });
  }

  static async contract(req: Request, res: Response) {
    res.status(200).json({
      contract: await ContractDocumentsService.getContract(
        Number(req.params.contractId)
      ),
    });
  }

  static async tree(req: Request, res: Response) {
    res
      .status(200)
      .json(
        await ContractDocumentsService.getTree(Number(req.params.contractId))
      );
  }

  static async attach(req: Request, res: Response) {
    const result = await ContractDocumentsService.attach({
      contractId: Number(req.params.contractId),
      levelCode: req.params.levelCode,
      artifactId: String(req.body.artifactId || ''),
      userId: getUserId(res),
    });
    res.status(200).json(result);
  }

  static async editSource(req: Request, res: Response) {
    res.status(200).json({
      source: await ContractDocumentsService.getEditSource(
        Number(req.params.contractId),
        req.params.levelCode,
        getUserId(res)
      ),
    });
  }

  static async replace(req: Request, res: Response) {
    const result = await ContractDocumentsService.replace({
      contractId: Number(req.params.contractId),
      levelCode: req.params.levelCode,
      artifactId: String(req.body.artifactId || ''),
      expectedCurrentVersionId: String(req.body.expectedCurrentVersionId || ''),
      userId: getUserId(res),
    });
    res.status(200).json(result);
  }

  static async download(req: Request, res: Response) {
    const { artifact, absolutePath } =
      await ContractDocumentsService.getDownload(
        Number(req.params.contractId),
        req.params.levelCode
      );
    res.download(absolutePath, artifact.safeName);
  }

  static async remove(req: Request, res: Response) {
    await ContractDocumentsService.removeCurrent(
      Number(req.params.contractId),
      req.params.levelCode,
      typeof req.query.currentVersionId === 'string'
        ? req.query.currentVersionId
        : undefined
    );
    res.status(204).send();
  }
}

export default ContractDocumentsController;
