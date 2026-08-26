import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';

import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isOpenCardSpecialist$ } from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import type { Specialists } from '@/types/types';
import { getIconDefault } from '@/utils/tools';

import CardSpecialist from './views/cardSpecialist/CardSpecialist';
import type { UsersDirectoryOutletContext } from '../users/UsersDirectory';

const Specialist = () => {
  const { view } = useOutletContext<UsersDirectoryOutletContext>();
  const { infoId } = useParams();
  const [specialists, setSpecialists] = useState<Specialists[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const getSpecialists = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const response = await axiosInstance.get<Specialists[]>('/specialists');
      setSpecialists(response.data);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void getSpecialists();
  }, [getSpecialists]);

  const filteredSpecialists = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    if (!term) return specialists;

    return specialists.filter(specialist =>
      [
        specialist.dni,
        specialist.firstName,
        specialist.lastName,
        specialist.phone,
        specialist.email,
        specialist.career,
        specialist.degree,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(term)
    );
  }, [searchTerm, specialists]);

  const handleAddSpecialist = () => {
    isOpenCardSpecialist$.setSubject = { isOpen: true };
  };

  const handleEditSpecialist = (specialist: Specialists) => {
    isOpenCardSpecialist$.setSubject = {
      isOpen: true,
      data: specialist,
      function: getSpecialists,
    };
  };

  const handleDeleteSpecialist = async (id: number) => {
    await axiosInstance.delete(`specialists/delete/${id}`);
    await getSpecialists();
  };

  if (view === 'split') {
    return (
      <AppPageShell className="rounded-xl">
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="flex min-h-[32rem] max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
              <div>
                <h1 className="text-base font-semibold text-foreground">
                  Usuarios externos
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isLoading
                    ? 'Cargando registros...'
                    : `${specialists.length} usuarios externos registrados`}
                </p>
              </div>
              <AppButton type="button" size="sm" onClick={handleAddSpecialist}>
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
                aria-label="Buscar usuarios externos por DNI o nombre"
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
                    Cargando usuarios externos...
                  </p>
                )}
                {!isLoading && hasLoadError && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    <p>No se pudo cargar la lista.</p>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => void getSpecialists()}
                    >
                      Reintentar
                    </AppButton>
                  </div>
                )}
                {!isLoading && !hasLoadError && !filteredSpecialists.length && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {searchTerm
                      ? 'No se encontraron usuarios externos con esa búsqueda.'
                      : 'Aún no hay usuarios externos registrados.'}
                  </p>
                )}
                {!isLoading &&
                  !hasLoadError &&
                  filteredSpecialists.map(specialist => (
                    <NavLink
                      key={specialist.id}
                      to={`informacion/${specialist.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                          isActive
                            ? 'bg-info-muted text-foreground'
                            : 'text-foreground hover:bg-muted'
                        }`
                      }
                    >
                      <Avatar className="size-10 border border-border bg-muted">
                        <AvatarImage
                          src={getIconDefault(
                            specialist.lastName || specialist.firstName
                          )}
                          alt=""
                        />
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {`${specialist.lastName}, ${specialist.firstName}`}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          DNI: {specialist.dni}
                        </span>
                      </span>
                    </NavLink>
                  ))}
              </div>
            </ScrollArea>
          </aside>
          <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
            {infoId ? (
              <Outlet />
            ) : (
              <div className="flex min-h-[24rem] flex-col items-center justify-center px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-info-muted text-info">
                  <UserRound aria-hidden="true" className="size-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  Selecciona un usuario externo
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Elige un registro de la lista para consultar y administrar su
                  información.
                </p>
              </div>
            )}
          </section>
        </div>
        <CardSpecialist onSave={getSpecialists} />
      </AppPageShell>
    );
  }

  if (infoId) {
    return (
      <AppPageShell className="rounded-xl">
        <div className="grid gap-3">
          <div>
            <AppButton asChild type="button" variant="outline" size="sm">
              <NavLink to="/centro-de-usuarios/usuarios/externos">
                <ChevronLeft aria-hidden="true" className="size-4" />
                Volver a usuarios externos
              </NavLink>
            </AppButton>
          </div>
          <section className="overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
            <Outlet />
          </section>
        </div>
        <CardSpecialist onSave={getSpecialists} />
      </AppPageShell>
    );
  }

  return (
    <AppPageShell className="rounded-xl">
      <section className="overflow-hidden rounded-xl border border-border bg-background shadow-app-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Usuarios externos
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isLoading
                ? 'Cargando registros...'
                : `${filteredSpecialists.length} usuarios externos en esta vista`}
            </p>
          </div>
          <AppButton type="button" size="sm" onClick={handleAddSpecialist}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo
          </AppButton>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <AppInput
              type="search"
              aria-label="Buscar usuarios externos"
              placeholder="Buscar por DNI, nombre o celular..."
              className="pl-9"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </div>
          {searchTerm && (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
            >
              Limpiar búsqueda
            </AppButton>
          )}
        </div>

        <AppTable className="min-w-[920px]">
          <AppTableHeader>
            <AppTableRow className="bg-muted/60 hover:bg-muted/60">
              <AppTableHead>Usuario</AppTableHead>
              <AppTableHead>Profesión</AppTableHead>
              <AppTableHead>Grado académico</AppTableHead>
              <AppTableHead>Celular</AppTableHead>
              <AppTableHead>Correo</AppTableHead>
              <AppTableHead>Documentos</AppTableHead>
              <AppTableHead className="text-center">Ficha</AppTableHead>
              <AppTableHead className="text-center">Editar</AppTableHead>
              <AppTableHead className="text-center">Eliminar</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {isLoading && (
              <AppTableRow>
                <AppTableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Cargando usuarios externos...
                </AppTableCell>
              </AppTableRow>
            )}

            {!isLoading && hasLoadError && (
              <AppTableRow>
                <AppTableCell colSpan={9} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se pudo cargar el directorio de usuarios externos.
                  </p>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void getSpecialists()}
                  >
                    Reintentar
                  </AppButton>
                </AppTableCell>
              </AppTableRow>
            )}

            {!isLoading &&
              !hasLoadError &&
              filteredSpecialists.map(specialist => (
                <AppTableRow key={specialist.id}>
                  <AppTableCell>
                    <div className="flex min-w-[15rem] items-center gap-3">
                      <Avatar className="size-10 border border-border bg-muted">
                        <AvatarImage
                          src={getIconDefault(
                            specialist.lastName || specialist.firstName
                          )}
                          alt=""
                        />
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {`${specialist.lastName}, ${specialist.firstName}`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          DNI: {specialist.dni}
                        </p>
                      </div>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="max-w-48">
                    <span className="line-clamp-2 font-medium">
                      {specialist.career || 'Pendiente'}
                    </span>
                  </AppTableCell>
                  <AppTableCell>{specialist.degree || 'Pendiente'}</AppTableCell>
                  <AppTableCell className="whitespace-nowrap">
                    {specialist.phone || 'Pendiente'}
                  </AppTableCell>
                  <AppTableCell className="max-w-56">
                    <span className="block truncate" title={specialist.email}>
                      {specialist.email || 'Pendiente'}
                    </span>
                  </AppTableCell>
                  <AppTableCell>
                    <AppBadge variant={specialist.cvFile ? 'success' : 'secondary'}>
                      <FileText aria-hidden="true" className="size-3" />
                      {specialist.cvFile ? 'CV registrado' : 'Sin CV'}
                    </AppBadge>
                  </AppTableCell>
                  <AppTableCell className="text-center">
                    <AppButton asChild type="button" variant="ghost" size="icon-sm">
                      <NavLink
                        to={`informacion/${specialist.id}`}
                        aria-label="Ver ficha del usuario externo"
                      >
                        <UserRound aria-hidden="true" className="size-4" />
                      </NavLink>
                    </AppButton>
                  </AppTableCell>
                  <AppTableCell className="text-center">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar usuario externo"
                      onClick={() => handleEditSpecialist(specialist)}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </AppButton>
                  </AppTableCell>
                  <AppTableCell className="text-center">
                    <AppButton
                      type="button"
                      variant="danger"
                      size="icon-sm"
                      aria-label="Eliminar usuario externo"
                      onClick={() => void handleDeleteSpecialist(specialist.id)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </AppButton>
                  </AppTableCell>
                </AppTableRow>
              ))}

            {!isLoading && !hasLoadError && !filteredSpecialists.length && (
              <AppTableRow>
                <AppTableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {searchTerm
                    ? 'No se encontraron usuarios externos con esa búsqueda.'
                    : 'Aún no hay usuarios externos registrados.'}
                </AppTableCell>
              </AppTableRow>
            )}
          </AppTableBody>
        </AppTable>
      </section>
      <CardSpecialist onSave={getSpecialists} />
    </AppPageShell>
  );
};

export { Specialist };
