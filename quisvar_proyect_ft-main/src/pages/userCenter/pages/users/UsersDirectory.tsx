import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Columns3, TableProperties } from 'lucide-react';

export type UsersDirectoryView = 'table' | 'split';

export type UsersDirectoryOutletContext = {
  view: UsersDirectoryView;
};

const getScopeLinkClassName = (isActive: boolean) =>
  `inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const UsersDirectory = () => {
  const [view, setView] = useState<UsersDirectoryView>('table');

  return (
  <div className="-mt-7 flex h-full min-h-0 flex-col gap-3">
    <header className="shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Tipo de usuarios"
          className="flex w-fit items-center rounded-lg border border-border bg-muted/40 p-1"
        >
          <NavLink
            to="internos"
            className={({ isActive }) => getScopeLinkClassName(isActive)}
          >
            Usuarios internos
          </NavLink>
          <NavLink
            to="externos"
            className={({ isActive }) => getScopeLinkClassName(isActive)}
          >
            Usuarios externos
          </NavLink>
        </nav>
        <div
          aria-label="Vista del directorio"
          className="flex items-center rounded-lg border border-border bg-muted/40 p-1"
        >
          <button
            type="button"
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              view === 'table'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <TableProperties aria-hidden="true" className="size-4" />
            Tabla
          </button>
          <button
            type="button"
            aria-pressed={view === 'split'}
            onClick={() => setView('split')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              view === 'split'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Columns3 aria-hidden="true" className="size-4" />
            Ficha dividida
          </button>
        </div>
      </div>
    </header>
    <div className="min-h-0 flex-1">
      <Outlet context={{ view } satisfies UsersDirectoryOutletContext} />
    </div>
  </div>
  );
};

export default UsersDirectory;
