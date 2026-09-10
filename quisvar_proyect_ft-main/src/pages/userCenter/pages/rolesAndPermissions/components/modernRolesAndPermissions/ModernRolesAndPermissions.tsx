import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SocketContext } from '@/context/SocketContex';
import { cn } from '@/lib/utils';
import { axiosInstance } from '@/services/axiosInstance';
import type { MenuPoint, MenuRole, MenuRoleForm, Roles } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { openDialog } from '@/utils/dialog';
import { handleStoredPermission } from '../../utils/tools';
import RoleDeleteConfirmation from '../roleTableRow/RoleDeleteConfirmation';

type Props = {
  roles: Roles[];
  onSave: () => Promise<void> | void;
  onCreateRole: () => void;
};

type PermissionItem = MenuRoleForm & { sectionTitle: string };

const accessLabels: Record<MenuRole, string> = {
  MOD: 'Administrador',
  MEMBER: 'Miembro',
  VIEWER: 'Solo lectura',
  USER: 'Usuario',
};

const flattenPermissions = (role: Roles): PermissionItem[] =>
  role.menuPoints.flatMap(menu =>
    menu.menu?.length
      ? menu.menu.map(item => ({ ...item, sectionTitle: menu.title }))
      : [{ ...menu, sectionTitle: menu.title }]
  );

const getStoredAccess = (
  draft: MenuPoint[],
  permission: MenuRoleForm
): MenuRole | undefined => {
  const menuId = permission.storage?.menuId ?? permission.id;
  const subMenuId = permission.storage?.subMenuId;
  const parent = draft.find(item => item.menuId === menuId);
  if (subMenuId === undefined) return parent?.typeRol;
  return parent?.subMenuPoints?.find(item => item.menuId === subMenuId)?.typeRol;
};

const permissionIdentity = (permission: MenuRoleForm) =>
  permission.permissionKey ??
  `${permission.storage?.menuId ?? permission.id}:${
    permission.storage?.subMenuId ?? 'root'
  }`;

const ModernRolesAndPermissions = ({
  roles,
  onSave,
  onCreateRole,
}: Props) => {
  const socket = useContext(SocketContext);
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id);
  const [query, setQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const selectedRole =
    roles.find(role => role.id === selectedRoleId) ?? roles[0] ?? null;
  const [draftName, setDraftName] = useState(selectedRole?.name ?? '');
  const [draftPermissions, setDraftPermissions] = useState<MenuPoint[]>(
    selectedRole?.menuPointsDb ?? []
  );

  useEffect(() => {
    if (!selectedRole) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server refreshes reset the selected role draft.
    setDraftName(selectedRole.name);
    setDraftPermissions(selectedRole.menuPointsDb);
    setIsEditing(false);
    setOpenSections(new Set());
  }, [selectedRole]);

  const filteredRoles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    if (!normalizedQuery) return roles;
    return roles.filter(role =>
      role.name.toLocaleLowerCase('es').includes(normalizedQuery)
    );
  }, [query, roles]);

  const permissions = useMemo(
    () => (selectedRole ? flattenPermissions(selectedRole) : []),
    [selectedRole]
  );
  const sections = useMemo(
    () =>
      permissions.reduce<Record<string, PermissionItem[]>>((result, item) => {
        (result[item.sectionTitle] ??= []).push(item);
        return result;
      }, {}),
    [permissions]
  );
  const enabledCount = permissions.filter(permission =>
    getStoredAccess(draftPermissions, permission)
  ).length;
  const sectionNames = Object.keys(sections);

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(current => {
      const next = new Set(current);
      if (next.has(sectionTitle)) next.delete(sectionTitle);
      else next.add(sectionTitle);
      return next;
    });
  };

  const selectRole = (roleId: number) => {
    setSelectedRoleId(roleId);
    setIsEditing(false);
  };

  const updatePermission = (
    permission: MenuRoleForm,
    access: MenuRole | ''
  ) => {
    setDraftPermissions(current =>
      handleStoredPermission(
        access,
        permission.storage?.menuId ?? permission.id,
        permission.storage?.subMenuId,
        current
      )
    );
  };

  const cancelEditing = () => {
    if (!selectedRole) return;
    setDraftName(selectedRole.name);
    setDraftPermissions(selectedRole.menuPointsDb);
    setIsEditing(false);
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    if (!draftName.trim()) {
      SnackbarUtilities.warning('El rol debe tener un nombre.');
      return;
    }
    if (draftPermissions.length === 0) {
      SnackbarUtilities.warning('Seleccione al menos un permiso para el rol.');
      return;
    }

    setIsSaving(true);
    try {
      await axiosInstance.put(`/role/${selectedRole.id}`, {
        name: draftName.trim(),
        menuPoints: draftPermissions,
      });
      socket.emit('client:refresh-user', selectedRole.id);
      SnackbarUtilities.success(`Rol "${draftName.trim()}" actualizado.`);
      await onSave();
      setIsEditing(false);
    } catch {
      SnackbarUtilities.error('No se pudieron guardar los cambios del rol.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selectedRole) return;
    try {
      const { data } = await axiosInstance.get(`/role/${selectedRole.id}`);
      const handle = openDialog({
        title: 'Confirmar eliminación de rol',
        description:
          'Los usuarios afectados deben ser reasignados antes de eliminar el rol.',
        width: 'min(100%, 36rem)',
        children: (
          <RoleDeleteConfirmation
            role={data}
            roles={roles.map(({ id, name }) => ({ id, name }))}
            onSave={() => void onSave()}
            onClose={() => handle?.close()}
          />
        ),
      });
      if (!handle) SnackbarUtilities.warning('No se pudo abrir la confirmación.');
    } catch {
      SnackbarUtilities.error('No se pudo consultar el impacto del rol.');
    }
  };

  if (!selectedRole) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <ShieldCheck className="mx-auto size-9 text-muted-foreground" />
          <p className="mt-3 font-semibold">Aún no hay roles configurados</p>
          <AppButton className="mt-4" onClick={onCreateRole}>
            <Plus aria-hidden="true" /> Crear primer rol
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-border bg-muted/30 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Roles</p>
              <p className="text-xs text-muted-foreground">
                {roles.length} configurado{roles.length === 1 ? '' : 's'}
              </p>
            </div>
            <AppButton
              size="icon"
              variant="outline"
              aria-label="Crear nuevo rol en la matriz legacy"
              title="Crear nuevo rol"
              onClick={onCreateRole}
            >
              <Plus aria-hidden="true" />
            </AppButton>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar rol…"
              aria-label="Buscar rol"
              className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </div>
        <ScrollArea className="max-h-64 flex-1 lg:max-h-none">
          <nav className="space-y-1 p-2" aria-label="Lista de roles">
            {filteredRoles.map(role => {
              const rolePermissions = flattenPermissions(role);
              const activePermissions = rolePermissions.filter(permission =>
                getStoredAccess(role.menuPointsDb, permission)
              ).length;
              const active = role.id === selectedRole.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold',
                      active
                        ? 'bg-primary-foreground/15'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {role.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {role.name}
                    </span>
                    <span
                      className={cn(
                        'block text-xs',
                        active
                          ? 'text-primary-foreground/75'
                          : 'text-muted-foreground'
                      )}
                    >
                      {activePermissions} de {rolePermissions.length} accesos
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                </button>
              );
            })}
            {filteredRoles.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No hay roles que coincidan con la búsqueda.
              </p>
            )}
          </nav>
        </ScrollArea>
      </aside>

      <main className="min-h-0 overflow-y-auto bg-muted/50">
        <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
          <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="min-w-0">
              {isEditing ? (
                <AppInput
                  label="Nombre del rol"
                  value={draftName}
                  onChange={event => setDraftName(event.target.value)}
                  className="max-w-md text-base font-semibold"
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedRole.name}
                    </h2>
                    <Badge variant="info">
                      {enabledCount} de {permissions.length} accesos
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revisa los módulos visibles y el nivel concedido en cada uno.
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <AppButton
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    <X aria-hidden="true" /> Cancelar
                  </AppButton>
                  <AppButton onClick={() => void saveRole()} disabled={isSaving}>
                    <Check aria-hidden="true" />
                    {isSaving ? 'Guardando…' : 'Guardar cambios'}
                  </AppButton>
                </>
              ) : (
                <>
                  <AppButton variant="danger" onClick={() => void deleteRole()}>
                    <Trash2 aria-hidden="true" /> Eliminar
                  </AppButton>
                  <AppButton onClick={() => setIsEditing(true)}>
                    <Pencil aria-hidden="true" /> Editar permisos
                  </AppButton>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {openSections.size} de {sectionNames.length} módulos abiertos
            </p>
            <div className="flex gap-2">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setOpenSections(new Set(sectionNames))}
                disabled={openSections.size === sectionNames.length}
              >
                <ChevronsDown aria-hidden="true" /> Abrir todo
              </AppButton>
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setOpenSections(new Set())}
                disabled={openSections.size === 0}
              >
                <ChevronsUp aria-hidden="true" /> Colapsar todo
              </AppButton>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {Object.entries(sections).map(([sectionTitle, items], sectionIndex) => {
              const sectionEnabled = items.filter(item =>
                getStoredAccess(draftPermissions, item)
              ).length;
              const isOpen = openSections.has(sectionTitle);
              const sectionId = `permission-section-${selectedRole.id}-${sectionIndex}`;
              return (
                <Card key={sectionTitle} className="shadow-none">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={sectionId}
                    onClick={() => toggleSection(sectionTitle)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {isOpen ? (
                        <ChevronDown
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      ) : (
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {sectionTitle}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sectionEnabled} de {items.length} habilitado
                          {items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={sectionEnabled ? 'success' : 'outline'}>
                      {sectionEnabled ? 'Con acceso' : 'Sin acceso'}
                    </Badge>
                  </button>
                  {isOpen && (
                  <CardContent
                    id={sectionId}
                    className="divide-y divide-border border-t border-border p-0"
                  >
                    {items.map(permission => {
                      const selectedAccess = getStoredAccess(
                        draftPermissions,
                        permission
                      );
                      return (
                        <div
                          key={permissionIdentity(permission)}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {permission.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {permission.permissionKey ?? 'Permiso legacy'}
                            </p>
                          </div>
                          {isEditing ? (
                            <div
                              className="flex flex-wrap justify-start gap-1 sm:justify-end"
                              role="radiogroup"
                              aria-label={`Acceso a ${permission.title}`}
                            >
                              {permission.access.map(access => (
                                <button
                                  key={access}
                                  type="button"
                                  role="radio"
                                  aria-checked={selectedAccess === access}
                                  onClick={() => updatePermission(permission, access)}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
                                    selectedAccess === access
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                  )}
                                >
                                  {accessLabels[access]}
                                </button>
                              ))}
                              <button
                                type="button"
                                role="radio"
                                aria-checked={!selectedAccess}
                                onClick={() => updatePermission(permission, '')}
                                className={cn(
                                  'rounded-md border px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
                                  !selectedAccess
                                    ? 'border-foreground bg-foreground text-background'
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                )}
                              >
                                Sin acceso
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-start sm:justify-end">
                              <Badge variant={selectedAccess ? 'success' : 'outline'}>
                                {selectedAccess
                                  ? accessLabels[selectedAccess]
                                  : 'Sin acceso'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModernRolesAndPermissions;
