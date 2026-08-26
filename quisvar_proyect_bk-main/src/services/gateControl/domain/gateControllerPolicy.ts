import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';

const GATE_CONTROLLER_DNIS = new Set(['70412578', '73520253', '78549254']);

export class GateControllerPolicy {
  static isController(user?: UserType | null) {
    const dni = user?.profile?.dni;
    return Boolean(dni && GATE_CONTROLLER_DNIS.has(dni));
  }

  static assertController(user?: UserType | null) {
    if (!this.isController(user)) {
      throw new AppError(
        'Solo el controlador de puerta puede realizar esta accion',
        403
      );
    }
  }
}
