import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Columns3, TableProperties } from 'lucide-react';
import './userCenter.css';
import { HEADER_USER_MODEL } from './models/userModelDef';
import Navbar from '@/components/navbar/Navbar';
import CardOpenFile from './pages/users/views/cardOpenFile/CardOpenFile';
import type {
  UsersDirectoryOutletContext,
  UsersDirectoryView,
} from './pages/users/UsersDirectory';

const UserCenter = () => {
  const location = useLocation();
  const [view, setView] = useState<UsersDirectoryView>('table');
  const isUsersDirectory = location.pathname.startsWith(
    '/centro-de-usuarios/usuarios/'
  );

  const directoryViewToggle = isUsersDirectory ? (
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
  ) : undefined;

  return (
    <div className="userCenter">
      <Navbar subMenu={HEADER_USER_MODEL} component={directoryViewToggle} />
      <div className="user-content ">
        <Outlet context={{ view } satisfies UsersDirectoryOutletContext} />
      </div>
      <CardOpenFile />
    </div>
  );
};

export default UserCenter;
