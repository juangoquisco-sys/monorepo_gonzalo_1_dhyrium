import { Request, Response } from 'express';
import { ProductionBonusStatus, ProductionBonusType } from '@prisma/client';
import ProductionBonusServices from '@/services/productionBonus.services';
import { UserType } from '@/middlewares/auth.middleware';

const getActorId = (res: Response) => Number(res.locals.userInfo?.id);
const hasProductionBonusModAccess = (res: Response) => {
  const userInfo = res.locals.userInfo as UserType;
  return !!userInfo?.role?.menuPoints?.some(
    menuPoint =>
      menuPoint.route === 'tramites' &&
      menuPoint.menu?.some(
        subMenu =>
          String(subMenu.route) === 'bono-produccion' &&
          subMenu.typeRol === 'MOD'
      )
  );
};

export const assignProductionBonus = async (req: Request, res: Response) => {
  const query = await ProductionBonusServices.assign(req.body, getActorId(res));
  res.status(201).json(query);
};

export const regularizeProductionBonus = async (
  req: Request,
  res: Response
) => {
  const query = await ProductionBonusServices.regularize(
    req.body,
    getActorId(res),
    hasProductionBonusModAccess(res)
  );
  res.status(201).json(query);
};

export const getProductionBonus = async (req: Request, res: Response) => {
  const query = await ProductionBonusServices.list(
    {
      page: Number(req.query.page),
      pageSize: Number(req.query.pageSize),
      status: req.query.status as ProductionBonusStatus,
      type: req.query.type as ProductionBonusType,
      searchName: req.query.searchName as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      mine: req.query.mine === 'true',
      forceMine: !hasProductionBonusModAccess(res),
    },
    getActorId(res)
  );
  res.status(200).json(query);
};

export const getProductionBonusSummary = async (
  req: Request,
  res: Response
) => {
  const query = await ProductionBonusServices.summary(
    getActorId(res),
    !hasProductionBonusModAccess(res) || req.query.mine === 'true'
  );
  res.status(200).json(query);
};

export const updateProductionBonusStatus = async (
  req: Request,
  res: Response
) => {
  const query = await ProductionBonusServices.updateStatus(
    req.params.id,
    getActorId(res),
    req.body.status as ProductionBonusStatus,
    req.body
  );
  res.status(200).json(query);
};

export const validateProductionBonus = async (req: Request, res: Response) => {
  const query = await ProductionBonusServices.updateStatus(
    req.params.id,
    getActorId(res),
    ProductionBonusStatus.VALIDADO,
    req.body
  );
  res.status(200).json(query);
};

export const liquidateProductionBonus = async (req: Request, res: Response) => {
  const query = await ProductionBonusServices.updateStatus(
    req.params.id,
    getActorId(res),
    ProductionBonusStatus.LIQUIDADO,
    req.body
  );
  res.status(200).json(query);
};
