import { MenuPoints, MenuRoles } from '@/models/menuPoints';
import AppError from '@/utils/appError';
import { RoleForMenuPick } from '@/utils/format.server';
import type { Role } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

const menuPoints = new MenuPoints();
class RoleService {
  static async ensureControlAttendanceSubMenus(id?: Role['id']) {
    const roleWhere = id ? { roleId: id } : {};
    const controlAttendanceMenus = await prisma.menuPoints.findMany({
      where: {
        menuId: 4,
        typeRol: 'MOD',
        ...roleWhere,
      },
      select: {
        id: true,
        subMenuPoints: {
          select: {
            menuId: true,
          },
        },
      },
    });

    const subMenusToCreate = controlAttendanceMenus.flatMap(menuPoint => {
      if (menuPoint.subMenuPoints.length > 0) return [];
      const existingSubMenus = new Set(
        menuPoint.subMenuPoints.map(subMenu => subMenu.menuId)
      );
      return [1, 2, 3]
        .filter(menuId => !existingSubMenus.has(menuId))
        .map(menuId => ({
          menuId,
          typeRol: 'MOD' as const,
          menuPointsId: menuPoint.id,
        }));
    });

    if (subMenusToCreate.length > 0) {
      await prisma.subMenuPoints.createMany({
        data: subMenusToCreate,
      });
    }

    const rolesWithUserAccess = await prisma.role.findMany({
      where: {
        ...(id ? { id } : {}),
        menuPoints: {
          some: {
            typeRol: 'USER',
          },
        },
        NOT: {
          menuPoints: {
            some: {
              menuId: 4,
              typeRol: 'MOD',
            },
          },
        },
      },
      select: {
        id: true,
        menuPoints: {
          where: {
            menuId: 4,
            typeRol: 'USER',
          },
          select: {
            id: true,
            subMenuPoints: {
              select: {
                menuId: true,
              },
            },
          },
        },
      },
    });

    for (const role of rolesWithUserAccess) {
      let controlAttendanceUserMenu = role.menuPoints[0];
      if (!controlAttendanceUserMenu) {
        controlAttendanceUserMenu = await prisma.menuPoints.create({
          data: {
            menuId: 4,
            typeRol: 'USER',
            roleId: role.id,
          },
          select: {
            id: true,
            subMenuPoints: {
              select: {
                menuId: true,
              },
            },
          },
        });
      }

      const hasIncidentsAccess = controlAttendanceUserMenu.subMenuPoints.some(
        subMenu => subMenu.menuId === 3
      );
      if (!hasIncidentsAccess) {
        await prisma.subMenuPoints.create({
          data: {
            menuId: 3,
            typeRol: 'USER',
            menuPointsId: controlAttendanceUserMenu.id,
          },
        });
      }
    }
  }

  static async getAllMenus() {
    await RoleService.ensureControlAttendanceSubMenus();
    const roles = await prisma.role.findMany({
      include: {
        menuPoints: {
          select: {
            id: true,
            menuId: true,
            typeRol: true,
            subMenuPoints: {
              select: {
                id: true,

                menuId: true,
                typeRol: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
    if (roles.length === 0) throw new AppError('Aun no se creo ningu rol', 404);
    return roles;
  }
  static async getAllForForm() {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    if (roles.length === 0) throw new AppError('Aun no se creo ningu rol', 404);
    return roles;
  }
  static async find(id: Role['id']) {
    await RoleService.ensureControlAttendanceSubMenus(id);
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          where: { status: true },
          select: {
            id: true,
            profile: {
              select: { firstName: true, lastName: true, dni: true },
            },
          },
          orderBy: { profile: { lastName: 'asc' } },
        },
        menuPoints: {
          select: {
            id: true,
            menuId: true,
            typeRol: true,
            subMenuPoints: {
              select: {
                id: true,
                menuId: true,
                typeRol: true,
              },
            },
          },
        },
      },
    });
    if (!role) throw new AppError('No se pudo encontrar el rol', 404);
    return role;
  }
  static async findAllGeneral() {
    const allRoles = await RoleService.getAllMenus();
    const allMenusWithRole = allRoles.map(role => ({
      ...menuPoints.getMenuOptions(role),
      menuPointsDb: role.menuPoints,
    }));
    return allMenusWithRole;
  }
  static async getAllMenusForAccess() {
    const allMenus = await RoleService.findAllGeneral();
    const getAllMenusForAccess = allMenus.map(menuAux => {
      return {
        ...menuAux,
        menuPoints: menuPoints.joinMenuRolAndMenuGeneral(
          menuAux.menuPoints as MenuRoles[]
        ),
      };
    });
    return getAllMenusForAccess;
  }
  static async findGeneral(id: Role['id']) {
    const role = await RoleService.find(id);
    const menusWithRole = menuPoints.getHeadersOptions(role);
    return menusWithRole;
  }

  static async create({ name, menuPoints }: RoleForMenuPick) {
    const roleHierarchy = await prisma.role.findFirst({
      select: {
        hierarchy: true,
      },
      orderBy: {
        hierarchy: 'desc',
      },
    });
    const maxHierarchy = roleHierarchy?.hierarchy || 0;
    const role = await prisma.role.create({
      data: {
        name,
        hierarchy: maxHierarchy + 1,
      },
    });

    for (const { menuId, typeRol, subMenuPoints } of menuPoints) {
      await prisma.menuPoints.create({
        data: {
          menuId,
          typeRol,
          roleId: role.id,
          subMenuPoints: {
            createMany: {
              data: subMenuPoints ?? [],
            },
          },
        },
      });
    }
    const getRole = await RoleService.find(role.id);

    return getRole;
  }
  static async delete(id: number, replacementRoleId?: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    if (replacementRoleId === id) {
      throw new AppError('El rol destino debe ser diferente al rol eliminado.', 400);
    }

    return prisma.$transaction(async tx => {
      const role = await tx.role.findUnique({
        where: { id },
        select: { id: true, name: true, _count: { select: { users: true } } },
      });
      if (!role) throw new AppError('No se pudo encontrar el rol', 404);

      if (role._count.users > 0 && !replacementRoleId) {
        throw new AppError(
          'Debe seleccionar un rol destino para reasignar a los usuarios afectados.',
          400
        );
      }

      if (replacementRoleId) {
        const replacement = await tx.role.findUnique({
          where: { id: replacementRoleId },
          select: { id: true },
        });
        if (!replacement) throw new AppError('El rol destino no existe.', 404);
        await tx.users.updateMany({
          where: { roleId: id },
          data: { roleId: replacementRoleId },
        });
      }

      await tx.role.delete({ where: { id } });
      return { id: role.id, reassignedUsers: role._count.users };
    });
  }
  static async editHierarchy(id: number, hierarchy: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const roleToMove = await prisma.role.findUnique({ where: { id } });
    await prisma.role.update({
      where: { id },
      data: { hierarchy },
    });
    const roles = await prisma.role.updateMany({
      where: {
        hierarchy: {
          gt: hierarchy,
          lt: roleToMove?.hierarchy,
        },
      },
      data: {
        hierarchy: {
          increment: 1,
        },
      },
    });

    return roles;
  }
  static async edit({ name, menuPoints }: RoleForMenuPick, id: number) {
    if (!name) throw new AppError('Asegurese de escribir un nombre', 404);
    const role = await prisma.role.upsert({
      where: { id },
      update: { name },
      create: {
        name,
      },
    });

    const menuRoleDb = await RoleService.find(id);
    for (const menu of menuRoleDb.menuPoints) {
      const findMenuRol = menuPoints.find(
        menuPoint => menuPoint.id === menu.id
      );
      if (!findMenuRol) {
        await prisma.menuPoints.delete({ where: { id: menu.id } });
      } else {
        for (const subMenu of menu.subMenuPoints) {
          const findSubMenuRol = findMenuRol.subMenuPoints.find(
            menuPoint => menuPoint.id === subMenu.id
          );

          if (!findSubMenuRol) {
            await prisma.subMenuPoints.delete({ where: { id: subMenu.id } });
          }
        }
      }
    }

    for (const menuPointData of menuPoints) {
      const { id: menuPointId, menuId, typeRol, subMenuPoints } = menuPointData;

      const existMenuPointId = menuPointId ?? 0;

      const menuUpsert = await prisma.menuPoints.upsert({
        where: { id: existMenuPointId },
        update: {
          typeRol,
          menuId,
        },
        create: {
          typeRol,
          menuId,
          roleId: role.id,
        },
      });

      for (const subMenuPointData of subMenuPoints || []) {
        const {
          id,
          menuId: subMenuId,
          typeRol: subMenuTypeRol,
        } = subMenuPointData;
        const existSubMenuPointId = id ?? 0;

        await prisma.subMenuPoints.upsert({
          where: { id: existSubMenuPointId },
          update: {
            typeRol: subMenuTypeRol,
            menuId: subMenuId,
          },
          create: {
            typeRol: subMenuTypeRol,
            menuId: subMenuId,
            menuPointsId: menuUpsert.id,
          },
        });
      }
    }
    const getRole = await RoleService.find(role.id);

    return getRole;
  }
}

export default RoleService;
