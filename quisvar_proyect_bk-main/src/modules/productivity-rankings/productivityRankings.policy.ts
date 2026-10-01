import type { UserType } from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import AppError from '@/utils/appError';

const MENU: 'control-asistencia' = 'control-asistencia';
const SUBMENU = 'rankings-productividad';

class ProductivityRankingsPolicy {
  static hasAccess(user: UserType): boolean {
    return role.accessMenuPoint(user, ['MOD', 'USER'], MENU, SUBMENU);
  }

  static isModerator(user: UserType): boolean {
    return role.accessMenuPoint(user, ['MOD'], MENU, SUBMENU);
  }

  static assertModerator(user: UserType) {
    if (!this.isModerator(user)) {
      throw new AppError(
        'No tiene permiso para administrar el modulo de rankings de productividad.',
        403,
        'PRODUCTIVITY_RANKINGS_MOD_REQUIRED'
      );
    }
  }
}

export default ProductivityRankingsPolicy;
