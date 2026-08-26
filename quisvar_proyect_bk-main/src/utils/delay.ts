import { Response, NextFunction, Request } from 'express';

const delay =
  (ms: number) => (_req: Request, _res: Response, next: NextFunction) => {
    setTimeout(next, ms);
  };

export default delay;
