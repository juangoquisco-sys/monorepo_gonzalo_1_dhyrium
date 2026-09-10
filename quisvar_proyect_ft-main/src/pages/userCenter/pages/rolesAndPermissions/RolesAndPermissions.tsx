import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, TableProperties } from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import './rolesAndPermissions.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { Menu, Roles } from '@/types/types';
import AddNewRol from './components/addNewRol/AddNewRol';
import ModernRolesAndPermissions from './components/modernRolesAndPermissions/ModernRolesAndPermissions';
import RoleTableRow from './components/roleTableRow/RoleTableRow';
import {
  buildAlignedPermissionMenus,
  buildAlignedRoles,
} from './utils/permissionPresentation';

type ViewMode = 'modern' | 'legacy';

const RolesAndPermissions = () => {
  const [menuPoints, setMenuPoints] = useState<Menu[] | null>(null);
  const [roles, setRoles] = useState<Roles[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('modern');
  const [isAddNewRole, setIsAddNewRole] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoadError(false);
    try {
      const [menuResponse, rolesResponse] = await Promise.all([
        axiosInstance.get<Menu[]>('/role/menuPoints'),
        axiosInstance.get<Roles[]>('/role/menusGeneral'),
      ]);
      setMenuPoints(buildAlignedPermissionMenus(menuResponse.data));
      setRoles(buildAlignedRoles(rolesResponse.data));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data load owns this screen state.
    void loadPermissions();
  }, [loadPermissions]);

  const openLegacyCreate = () => {
    setViewMode('legacy');
    setIsAddNewRole(true);
  };

  return (
    <AppPageShell className="flex h-full min-h-[32rem] flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">CENTRO DE USUARIOS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Roles y permisos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Administra un rol a la vez y revisa sus accesos según la ubicación
            actual de cada módulo.
          </p>
        </div>
        <Tabs
          value={viewMode}
          onValueChange={value => setViewMode(value as ViewMode)}
          aria-label="Modo de visualización"
        >
          <TabsList>
            <TabsTrigger value="modern" className="gap-1.5">
              <LayoutGrid aria-hidden="true" className="size-4" />
              Vista moderna
            </TabsTrigger>
            <TabsTrigger value="legacy" className="gap-1.5">
              <TableProperties aria-hidden="true" className="size-4" />
              Matriz legacy
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {isLoading ? (
        <div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">
          Cargando roles y permisos…
        </div>
      ) : loadError || !menuPoints || !roles ? (
        <div className="grid flex-1 place-items-center p-6">
          <div className="text-center">
            <p className="font-semibold text-foreground">
              No se pudieron cargar los permisos
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Comprueba la conexión con el servidor y vuelve a intentarlo.
            </p>
            <AppButton className="mt-4" onClick={() => void loadPermissions()}>
              Reintentar
            </AppButton>
          </div>
        </div>
      ) : viewMode === 'modern' ? (
        <ModernRolesAndPermissions
          roles={roles}
          onSave={loadPermissions}
          onCreateRole={openLegacyCreate}
        />
      ) : (
        <div className="rolesAndPermissions p-4 sm:p-5">
          <div className="rolesAndPermissions-header">
            <AppButton
              variant={isAddNewRole ? 'outline' : 'primary'}
              onClick={() => setIsAddNewRole(current => !current)}
            >
              {isAddNewRole ? 'Cancelar' : 'Agregar nuevo rol'}
            </AppButton>
          </div>
          <div className="rolesAndPermissions-table-contain">
            <div
              className="rolesAndPermissions-table-header"
              style={{ gridTemplateColumns: `2fr ${menuPoints.length}fr` }}
            >
              <div className="rolesAndPermissions-table-header-text">ROL</div>
              <div className="rolesAndPermissions-table-header-text rolesAndPermissions-separator">
                PERMISOS DE ACCESO
              </div>
            </div>
            <div
              className="rolesAndPermissions-table-subHeader"
              style={{
                gridTemplateColumns: `2fr repeat(${menuPoints.length}, 1fr)`,
              }}
            >
              <div className="rolesAndPermissions-table-header-text">-</div>
              {menuPoints.map(menuPoint => (
                <div
                  key={menuPoint.id}
                  className="rolesAndPermissions-table-subHeader-text rolesAndPermissions-separator"
                >
                  {menuPoint.title}
                </div>
              ))}
            </div>
            <div className="rolesAndPermissions-body-contain">
              {roles.map(role => (
                <RoleTableRow
                  key={role.id}
                  rol={role}
                  roles={roles}
                  onSave={loadPermissions}
                />
              ))}
            </div>
            {isAddNewRole && (
              <AddNewRol
                menuPoints={menuPoints}
                onSave={loadPermissions}
                handleAddNewRole={() => setIsAddNewRole(false)}
              />
            )}
          </div>
        </div>
      )}
    </AppPageShell>
  );
};

export default RolesAndPermissions;
