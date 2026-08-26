import { ControllerFunction } from '@/types/patterns';
import { ENV } from '@/config/env';

class PdfGenerateMiddleware {
  public verifyToken: ControllerFunction = async (req, res, next) => {
    res.locals.IV = ENV.IV;
    res.locals.SECRET_CODE = ENV.SECRET_CODE;
    next();
  };
}
export default PdfGenerateMiddleware;
