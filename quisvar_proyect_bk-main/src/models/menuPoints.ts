import { MenuRol } from '@prisma/client';

export type MenuAccess =
  | 'home'
  | 'tramites'
  | 'especialidades'
  | 'asistencia'
  | 'control-asistencia'
  | 'centro-de-usuarios'
  | 'empresas'
  | 'especialistas'
  | 'indice-general'
  | 'grupos'
  | 'tutorials'
  | 'cocina'
  | 'mis-tareas'
  | 'rotaciones'
  | 'control-puerta'
  | 'metrados';

export type MenuRole = 'MOD' | 'MEMBER' | 'VIEWER' | 'USER';
interface MenuGeneral {
  id: number;
  title: string;
  access: MenuRole[];
}
export interface MenuRoles {
  id: number;
  title: string;
  route: MenuAccess;
  typeRol: MenuRole;
  menu?: MenuRoles[];
}
interface Menu extends MenuGeneral {
  route: MenuAccess;
  menu?: SubMenu[];
  noView?: boolean;
}
interface SubMenu extends MenuGeneral {
  route: string;
  noView?: boolean;
}
interface RelationMenu {
  [key: number]: SubMenu[];
}
export interface Role {
  id: number;
  name: string;
  menuPoints: RoleMenu[];
}
interface RoleMenu {
  id: number;
  menuId: number;
  typeRol: MenuRol;
  menu?: Menu;
  subMenuPoints?: RoleMenu[];
}
interface MenuHeader {
  id: number;
  idRelation: number;
  typeRol: MenuRol;
  route: string;
  title: string;
  menu?: (MenuHeader | undefined)[] | null;
  noView?: boolean;
}
export class MenuPoints {
  private _menuPoints: Menu[] = MENU_POINTS;
  private _subMenuPoints: RelationMenu = SUBMENU_POINTS;

  public roleTransform(data: Role) {
    const { menuPoints, name, id } = data;
    const newMenuPoints: (MenuHeader | undefined)[] = menuPoints.map(
      menuPoint => {
        const { menuId, typeRol, subMenuPoints, id: idRelation } = menuPoint;
        const findMenu = this._menuPoints.find(({ id }) => id === menuId);
        if (!findMenu) return;
        const { id, route, title, noView } = findMenu;
        let menu: (MenuHeader | undefined)[] | null = null;
        if (subMenuPoints && subMenuPoints.length > 0) {
          const subMenus = this._subMenuPoints[menuId] ?? null;
          if (subMenus) {
            menu = subMenuPoints.map(subMenuPoint => {
              const { menuId, typeRol, id: idRelation } = subMenuPoint;
              const findSubMenu = subMenus.find(({ id }) => id === menuId);
              if (!findSubMenu) return;
              const { access: _, ...rest } = findSubMenu;
              return { typeRol, idRelation, ...rest };
            });
          }
        }
        const menuPointsValues: MenuHeader = {
          id,
          typeRol,
          route,
          title,
          idRelation,
          noView,
        };
        if (menu) {
          menuPointsValues.menu = menu;
        }
        return menuPointsValues;
      }
    );
    return { name, id, menu: newMenuPoints };
  }

  public getMenuPoints = () => {
    const newMenuPoints = this._menuPoints.map(menuPoint => {
      const menu = this._subMenuPoints[menuPoint.id];
      if (menu) menuPoint.menu = menu;
      return menuPoint;
    });

    return newMenuPoints;
  };
  public getHeadersOptions(data: Role) {
    const { id, name, menu } = this.roleTransform(data);
    const menuFilter = menu.filter(men => !!men) as MenuHeader[];
    const menuPoints = menuFilter.map(
      ({ id, route, title, typeRol, menu, noView }) => {
        const menuFilter = menu?.filter(men => !!men) as MenuHeader[];
        const menuOrder = menuFilter?.sort((a, b) => a.id - b.id);
        return {
          id,
          route,
          title,
          menu: menuOrder,
          typeRol,
          noView,
        };
      }
    );
    const menuPointsOrder = menuPoints.sort((a, b) => a.id - b.id);
    return { id, name, menuPoints: menuPointsOrder };
  }
  public getMenuOptions(data: Role) {
    const { id, name, menu } = this.roleTransform(data);
    const menuFilter = menu.filter(men => !!men) as MenuHeader[];
    const menuPoints = menuFilter.map(
      ({ id, route, title, typeRol, idRelation, menu }) => {
        const menuFilter = menu?.filter(men => !!men) as
          | MenuHeader[]
          | undefined;
        return {
          id,
          route,
          title,
          typeRol,
          idRelation,
          menu: menuFilter,
        };
      }
    );
    return { id, name, menuPoints };
  }

  public joinMenuRolAndMenuGeneral(menuRol: MenuRoles[]) {
    const newMenuPoint = this.getMenuPoints().map(menuPoint => {
      const findMenuRol = menuRol.find(menu => menu.id === menuPoint.id);
      const newSubMenu = menuPoint.menu?.map(subMenu => {
        const findSubMenuRol = findMenuRol?.menu?.find(
          menu => menu?.id === subMenu.id
        );
        return findMenuRol ? { ...subMenu, ...findSubMenuRol } : subMenu;
      });
      return findMenuRol
        ? { ...menuPoint, ...{ ...findMenuRol, menu: newSubMenu } }
        : menuPoint;
    });
    return newMenuPoint;
  }
}

const MENU_POINTS: Menu[] = [
  { id: 1, title: 'Inicio', route: 'home', access: ['MOD'] },
  { id: 2, title: 'Tramites', route: 'tramites', access: ['MOD'] },
  {
    id: 3,
    title: 'Proyectos',
    route: 'especialidades',
    access: ['MOD', 'VIEWER', 'MEMBER'],
  },
  {
    id: 4,
    title: 'Control de asistencia',
    route: 'control-asistencia',
    access: ['MOD', 'USER'],
  },
  { id: 5, title: 'Usuarios', route: 'centro-de-usuarios', access: ['MOD'] },

  {
    id: 6,
    title: 'Empresas',
    route: 'empresas',
    access: ['MOD'],
  },
  {
    id: 8,
    title: 'Indice General',
    route: 'indice-general',
    access: ['MOD'],
  },
  {
    id: 9,
    title: 'Oficinas y Reuniones',
    route: 'grupos',
    access: ['MOD', 'MEMBER', 'VIEWER', 'USER'],
  },
  {
    id: 10,
    title: 'Tutorials',
    route: 'tutorials',
    access: ['MOD', 'VIEWER'],
  },
  {
    id: 11,
    title: 'Mis Tareas',
    route: 'mis-tareas',
    access: ['MOD'],
    noView: true,
  },
  {
    id: 12,
    title: 'Cocina',
    route: 'cocina',
    access: ['MOD'],
    noView: true,
  },
  {
    id: 13,
    title: 'Rotaciones',
    route: 'rotaciones',
    access: ['MOD'],
    noView: true,
  },
  {
    id: 14,
    title: 'Control de puerta',
    route: 'control-puerta',
    access: ['MOD', 'USER'],
    noView: true,
  },
  {
    id: 15,
    title: 'Metrado de Estructuras',
    route: 'metrados',
    access: ['MOD'],
    noView: true,
  },
];

export const INDICE_GENERAL_OPTIONS: SubMenu[] = [
  { id: 1, title: 'DTI', route: 'contratos', access: ['MOD'] },
  { id: 2, title: 'AC', route: 'contratos', access: ['MOD'] },
  { id: 3, title: 'DPP', route: 'contratos', access: ['MOD'] },
  { id: 4, title: 'DRP', route: 'contratos', access: ['MOD'] },
  { id: 5, title: 'DIEB', route: 'contratos', access: ['MOD'] },
  { id: 6, title: 'CPE', route: 'contratos', access: ['MOD'] },
  { id: 7, title: 'Imagen Inst', route: 'contratos', access: ['MOD'] },
  { id: 8, title: 'OSCE', route: 'contratos', access: ['MOD'] },
  { id: 9, title: 'SUNAT', route: 'contratos', access: ['MOD'] },
  { id: 10, title: 'DCA,CC', route: 'contratos', access: ['MOD'] },
  { id: 11, title: 'CF', route: 'contratos', access: ['MOD'] },
  { id: 12, title: 'DEP', route: 'contratos', access: ['MOD'] },
  { id: 13, title: 'DEE', route: 'contratos', access: ['MOD'] },
  { id: 14, title: 'CAEC', route: 'contratos', access: ['MOD'] },
];

export const TRAMITES_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'Trámite de pagos',
    route: 'tramite-de-pago',
    access: ['MOD', 'USER'],
  },
  {
    id: 2,
    title: 'Trámite regulares',
    route: 'tramite-regular',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Comunicados',
    route: 'comunicado',
    access: ['MOD', 'USER'],
  },
  { id: 4, title: 'Salidas', route: 'salidas', access: ['MOD', 'USER'] },
  {
    id: 5,
    title: 'Planillas',
    route: 'planilla',
    access: ['MOD', 'USER'],
    noView: true,
  },
  {
    id: 6,
    title: 'Bono por produccion',
    route: 'bono-produccion',
    access: ['MOD', 'USER'],
  },
];
export const TAREAS_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'Tareas técnicas',
    route: 'tecnicas',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Tareas a revisar',
    route: 'para-revisar',
    access: ['MOD'],
  },
  {
    id: 2,
    title: 'Tareas administrativas',
    route: 'administrativas',
    access: ['MOD'],
  },
];
export const COCINA_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'formulario',
    route: 'formulario',
    access: ['MOD'],
  },
  {
    id: 2,
    title: 'Historial',
    route: 'historial',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Lista',
    route: 'lista',
    access: ['MOD'],
  },
];
export const ROTACIONES_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'Mis turnos',
    route: 'mis-turnos',
    access: ['MOD'],
  },
  {
    id: 2,
    title: 'Configuracion',
    route: 'configuracion',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Reporte Operativo',
    route: 'reporte-operativo',
    access: ['MOD'],
  },
];
export const CONTROL_ASISTENCIA_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'Registro',
    route: 'registro',
    access: ['MOD'],
  },
  {
    id: 2,
    title: 'Reconciliar faltas',
    route: 'reconciliar-faltas',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Incidencias',
    route: 'incidencias',
    access: ['MOD', 'USER'],
  },
];
export const CONTROL_PUERTA_OPTIONS: SubMenu[] = [
  {
    id: 1,
    title: 'Monitor',
    route: 'monitor',
    access: ['MOD'],
  },
  {
    id: 2,
    title: 'Regularizaciones',
    route: 'regularizaciones',
    access: ['MOD'],
  },
  {
    id: 3,
    title: 'Historial',
    route: 'historial',
    access: ['MOD'],
  },
  {
    id: 4,
    title: 'Mi control',
    route: 'mi-control',
    access: ['MOD', 'USER'],
  },
];

const SUBMENU_POINTS: RelationMenu = {
  2: TRAMITES_OPTIONS,
  4: CONTROL_ASISTENCIA_OPTIONS,
  8: INDICE_GENERAL_OPTIONS,
  11: TAREAS_OPTIONS,
  12: COCINA_OPTIONS,
  13: ROTACIONES_OPTIONS,
  14: CONTROL_PUERTA_OPTIONS,
};
