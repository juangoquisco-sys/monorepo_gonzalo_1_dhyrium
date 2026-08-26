import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Award,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  History,
  Pencil,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenCardRegisterUser$ } from '@/services/sharingSubject';
import type { GeneralFile, RoleForm, User } from '@/types/types';
import { openDialog } from '@/utils/dialog';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getIconDefault } from '@/utils/tools';

import useUserCenterUsers from './hooks/useUserCenterUsers';
import UserEditWorkspace from './views/userEditWorkspace/UserEditWorkspace';
import CardRegisterUser from './views/cardRegisterUser/CardRegisterUser';
import UsersList from './UsersList';
import type { UsersDirectoryOutletContext } from './UsersDirectory';

type DetailSectionProps = {
  title: string;
  icon: typeof UserRound;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const DetailSection = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: DetailSectionProps) => (
  <section className="border-b border-border last:border-b-0">
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <span className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4" />
        {title}
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    {isOpen && <div className="px-5 pb-5">{children}</div>}
  </section>
);

const valueOrPending = (value?: string | null) => value || 'Pendiente';

const InternalUsersDirectory = () => {
  const { view } = useOutletContext<UsersDirectoryOutletContext>();
  const { data: users, isLoading, refetch } = useUserCenterUsers();
  const [selectedUserId, setSelectedUserId] = useState<number>();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSection, setOpenSection] = useState('Ficha de usuario');
  const [roles, setRoles] = useState<RoleForm[] | null>(null);
  const [generalFiles, setGeneralFiles] = useState<GeneralFile[] | null>(null);

  useEffect(() => {
    void Promise.all([
      axiosInstance.get<RoleForm[]>('/role/form'),
      axiosInstance.get<GeneralFile[]>('/files/generalFiles'),
    ]).then(([rolesResponse, filesResponse]) => {
      setRoles(rolesResponse.data);
      setGeneralFiles(filesResponse.data);
    });
  }, []);

  const activeUsers = useMemo(
    () => (users || []).filter(user => user.status !== false),
    [users]
  );
  const visibleUsers = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    if (!term) return activeUsers;
    return activeUsers.filter(user =>
      [
        user.profile.firstName,
        user.profile.lastName,
        user.profile.dni,
        user.profile.phone,
        user.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(term)
    );
  }, [activeUsers, searchTerm]);
  const selectedUser = activeUsers.find(user => user.id === selectedUserId);

  const editUser = (user: User) => {
    if (!roles) return;
    const dialogHandle = openDialog({
      title: 'Editar usuario',
      width: 'min(100%, 112rem)',
      maxHeight: 'min(92vh, 72rem)',
      children: (
        <UserEditWorkspace
          user={user}
          roles={roles}
          generalFiles={generalFiles}
          onUsersRefresh={async () => {
            await refetch();
          }}
        />
      ),
    });

    if (!dialogHandle) {
      SnackbarUtilities.warning(
        'Cierre la ventana actual antes de editar otro usuario.'
      );
    }
  };

  const addUser = () => {
    if (!roles) return;
    isOpenCardRegisterUser$.setSubject = { isOpen: true, roles };
  };

  const toggleSection = (section: string) => {
    setOpenSection(current => (current === section ? '' : section));
  };

  if (view === 'table') return <UsersList />;

  return (
    <AppPageShell className="rounded-xl">
      <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex min-h-[32rem] max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Usuarios internos
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isLoading
                  ? 'Cargando registros...'
                  : `${activeUsers.length} usuarios internos registrados`}
              </p>
            </div>
            <AppButton type="button" size="sm" onClick={addUser} disabled={!roles}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo
            </AppButton>
          </div>

          <div className="relative border-b border-border p-3">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <AppInput
              type="search"
              aria-label="Buscar usuarios internos por DNI o nombre"
              placeholder="Buscar por DNI o nombre"
              className="pl-9"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </div>

          <ScrollArea
            type="always"
            className="min-h-0 flex-1 p-2 pr-1 [&_[data-slot=scroll-area-scrollbar]]:w-3 [&_[data-slot=scroll-area-scrollbar]]:p-0.5 [&_[data-slot=scroll-area-thumb]]:bg-border [&_[data-slot=scroll-area-thumb]]:hover:bg-primary/60"
          >
            <div className="grid gap-1">
              {isLoading && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Cargando usuarios...
                </p>
              )}
              {!isLoading && !visibleUsers.length && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No se encontraron usuarios con esa búsqueda.
                </p>
              )}
              {visibleUsers.map(user => {
                const isSelected = user.id === selectedUserId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      isSelected
                        ? 'bg-info-muted text-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Avatar className="size-10 border border-border bg-muted">
                      <AvatarImage src={getIconDefault(user.profile.dni)} alt="" />
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {user.profile.lastName}, {user.profile.firstName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        DNI: {user.profile.dni}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
          {!selectedUser ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-info-muted text-info">
                <UsersRound aria-hidden="true" className="size-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Selecciona un usuario interno
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Elige un registro de la lista para consultar y administrar su información.
              </p>
            </div>
          ) : (
            <>
              <DetailSection
                title="Ficha de usuario"
                icon={UserRound}
                isOpen={openSection === 'Ficha de usuario'}
                onToggle={() => toggleSection('Ficha de usuario')}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-14 border border-border bg-muted">
                      <AvatarImage src={getIconDefault(selectedUser.profile.dni)} alt="" />
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedUser.profile.firstName} {selectedUser.profile.lastName}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">DNI {selectedUser.profile.dni}</p>
                    </div>
                  </div>
                  <AppButton type="button" size="sm" variant="outline" onClick={() => editUser(selectedUser)} disabled={!roles}>
                    <Pencil aria-hidden="true" className="size-4" />
                    Editar ficha
                  </AppButton>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-medium text-muted-foreground">Teléfono</dt><dd>{valueOrPending(selectedUser.profile.phone)}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Correo</dt><dd className="break-all">{selectedUser.email}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">CV</dt><dd>{selectedUser.cv ? 'Registrado' : 'Pendiente'}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Datos generales</dt><dd>{valueOrPending(selectedUser.address)}</dd></div>
                </dl>
              </DetailSection>

              <DetailSection title="Grado académico" icon={GraduationCap} isOpen={openSection === 'Grado académico'} onToggle={() => toggleSection('Grado académico')}>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-medium text-muted-foreground">Carrera</dt><dd>{valueOrPending(selectedUser.profile.job?.label)}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Grado académico</dt><dd>{valueOrPending(selectedUser.profile.degree)}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Colegiatura</dt><dd>Pendiente</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Fecha de inscripción</dt><dd>Pendiente</dd></div>
                </dl>
              </DetailSection>

              <DetailSection title="Experiencia" icon={BriefcaseBusiness} isOpen={openSection === 'Experiencia'} onToggle={() => toggleSection('Experiencia')}>
                <p className="text-sm text-muted-foreground">No hay experiencias registradas en la ficha interna actual.</p>
              </DetailSection>
              <DetailSection title="Capacitaciones" icon={Award} isOpen={openSection === 'Capacitaciones'} onToggle={() => toggleSection('Capacitaciones')}>
                <p className="text-sm text-muted-foreground">No hay capacitaciones registradas en la ficha interna actual.</p>
              </DetailSection>
              <DetailSection title="Historial" icon={History} isOpen={openSection === 'Historial'} onToggle={() => toggleSection('Historial')}>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-medium text-muted-foreground">Rol y permisos</dt><dd>{selectedUser.role?.name || 'Sin rol asignado'}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Planilla</dt><dd>{selectedUser.payrollInfo ? 'Registrada' : 'Pendiente'}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Equipo asignado</dt><dd>{selectedUser.equipment?.name || 'Sin equipo asignado'}</dd></div>
                  <div><dt className="text-xs font-medium text-muted-foreground">Estado</dt><dd>{selectedUser.status === false ? 'Archivado' : 'Activo'}</dd></div>
                </dl>
              </DetailSection>
            </>
          )}
        </section>
      </div>
      <CardRegisterUser
        onSave={() => {
          void refetch();
        }}
        generalFiles={generalFiles}
      />
    </AppPageShell>
  );
};

export default InternalUsersDirectory;
