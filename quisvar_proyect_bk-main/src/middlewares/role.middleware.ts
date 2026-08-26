import { Request, Response, NextFunction } from 'express';
import { UserType } from '@/middlewares/auth.middleware';
// import { UserRole } from '@prisma/client';
import AppError from '@/utils/appError';
import { MenuAccess, MenuRole } from '@/models/menuPoints';

const roleHandler =
  (roles: any[]) => (req: Request, res: Response, next: NextFunction) => {
    const userInfo: UserType = res.locals.userInfo;
    // console.log(roles);
    // console.log('userInfo', JSON.stringify(userInfo, null, 2));
    // const { role } = userInfo;
    // if (!roles.includes(role)) {
    //   throw new AppError(`${role} no tiene acceso a esta ruta`, 400);
    // }
    next();
  };

class Role {
  accessMenuPoint(
    userInfo: UserType,
    typeRol: MenuRole[],
    menu: MenuAccess,
    subMenu?: string
  ): boolean {
    let hasAccess: boolean | undefined = false;

    if (subMenu) {
      hasAccess = userInfo.role.menuPoints.some(menuPoint => {
        return (
          menuPoint.route === menu &&
          menuPoint.menu?.some(
            menuPoint =>
              menuPoint.route === subMenu && typeRol.includes(menuPoint.typeRol)
          )
        );
      });
    } else {
      hasAccess = userInfo.role.menuPoints.some(
        menuPoint =>
          menuPoint.route === menu && typeRol.includes(menuPoint.typeRol)
      );
    }
    return !!hasAccess;
  }
  public RoleHandler =
    (typeRol: MenuRole[], menu: MenuAccess, subMenu?: string) =>
    (req: Request, res: Response, next: NextFunction) => {
      const userInfo: UserType = res.locals.userInfo;
      const hasAccess = this.accessMenuPoint(userInfo, typeRol, menu, subMenu);
      if (!hasAccess) {
        throw new AppError(
          `Rol: ${userInfo.role.name} no tiene acceso a esta ruta`,
          403
        );
      }
      next();
    };

  public AnyRoleHandler =
    (
      checks: {
        typeRol: MenuRole[];
        menu: MenuAccess;
        subMenu?: string;
      }[]
    ) =>
    (req: Request, res: Response, next: NextFunction) => {
      const userInfo: UserType = res.locals.userInfo;
      const hasAccess = checks.some(check =>
        this.accessMenuPoint(userInfo, check.typeRol, check.menu, check.subMenu)
      );
      if (!hasAccess) {
        throw new AppError(
          `Rol: ${userInfo.role.name} no tiene acceso a esta ruta`,
          403
        );
      }
      next();
    };
}
export default new Role();

export const _admin_role = roleHandler([
  'SUPER_ADMIN',
  'ADMIN',
  'ASSISTANT',
  'ASSISTANT_ADMINISTRATIVE',
  'AREA_MOD',
]);
export const _mod_role = roleHandler([
  'SUPER_ADMIN',
  'ADMIN',
  'ASSISTANT',
  'SUPER_MOD',
  'MOD',
]);
export const _employee_role = roleHandler([
  'SUPER_ADMIN',
  'ADMIN',
  'ASSISTANT',
  'SUPER_MOD',
  'MOD',
  'EMPLOYEE',
  'ASSISTANT_ADMINISTRATIVE',
]);
