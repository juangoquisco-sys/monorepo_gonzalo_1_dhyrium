import { NextFunction, Request, Response, Router } from 'express';

export abstract class SetUpRouter {
  public abstract router: Router;
  protected abstract setUpRouter(): void;
}

export interface InitialRouter {
  router: Router;
}

export type ControllerFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export interface ControllersBasic {
  showMessages: ControllerFunction;
}
