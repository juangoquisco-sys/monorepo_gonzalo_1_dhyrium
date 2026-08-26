import { Outlet, useLocation } from 'react-router-dom';
import './VideoTutorials.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import FolderItem from './components/FolderItem/FolderItem';
import FolderAddInput from './components/FolderAddInput/FolderAddInput';
import { LuFolderPlus, LuMonitorPlay } from 'react-icons/lu';
import { folderService } from './services/folderVideos.service';
import { countFoldersVideos } from './utils/countFolderVideos';
import type { Folder } from './types/type.res';
import { useTutorialPermissions } from './hooks/useTutorialPermissions';

const countFolders = (folders: Folder[]): number =>
  folders.reduce(
    (total, folder) => total + 1 + countFolders(folder.children || []),
    0
  );

const VideoTutorials = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [folderError, setFolderError] = useState<string | null>(null);
  const location = useLocation();
  const { canManageTutorials } = useTutorialPermissions();

  const isFolderRoute = location.pathname.includes('/tutorials/list/');
  const totalFolders = useMemo(() => countFolders(folders), [folders]);
  const totalVideos = useMemo(() => countFoldersVideos(folders), [folders]);

  const refreshFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setFolderError(null);
    try {
      await folderService.getFolders();
    } catch {
      setFolderError('No se pudieron cargar las carpetas de tutoriales.');
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    const subscription = folderService.folderObservable.subscribe(setFolders);
    const refreshTimeout = window.setTimeout(() => void refreshFolders(), 0);

    return () => {
      window.clearTimeout(refreshTimeout);
      subscription.unsubscribe();
    };
  }, [refreshFolders]);

  return (
    <div className="vt-main">
      <aside className="vt-side" aria-label="Carpetas de videos tutoriales">
        <header className="vt-side-header">
          <div className="vt-title-block">
            <LuMonitorPlay className="vt-title-icon" aria-hidden="true" />
            <div>
              <p className="vt-kicker">Biblioteca tecnica</p>
              <h1 className="vt-title">Videos tutoriales</h1>
            </div>
          </div>
          <div className="vt-stats" aria-label="Resumen de biblioteca">
            <span>{totalFolders} carpetas</span>
            <span>{totalVideos} videos</span>
          </div>
        </header>

        <div className="vt-folder-list" aria-live="polite">
          {isLoadingFolders ? (
            <div className="vt-folder-state">Cargando carpetas...</div>
          ) : folderError ? (
            <div className="vt-folder-state vt-folder-state--error">
              <p>{folderError}</p>
              <button type="button" onClick={() => void refreshFolders()}>
                Reintentar
              </button>
            </div>
          ) : folders.length === 0 ? (
            <div className="vt-folder-state">
              {canManageTutorials
                ? 'Aun no hay carpetas. Crea una categoria para organizar los videos.'
                : 'Aun no hay carpetas de tutoriales disponibles.'}
            </div>
          ) : (
            <nav className="vt-folder-nav" aria-label="Lista de carpetas">
              {folders.map(folder => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  canManage={canManageTutorials}
                  onSave={() => void refreshFolders()}
                />
              ))}
            </nav>
          )}
        </div>
        {canManageTutorials && !showInput ? (
          <button
            type="button"
            className="vt-btn-area"
            onClick={() => setShowInput(true)}
            aria-label="Agregar categoria de tutoriales"
          >
            <LuFolderPlus aria-hidden="true" />
            <span className="vt-btn-text">Agregar categoria</span>
          </button>
        ) : canManageTutorials ? (
          <FolderAddInput
            onSave={() => void refreshFolders()}
            setBtnActive={() => setShowInput(!showInput)}
            id={null}
          />
        ) : null}
      </aside>
      <section className="vt-content">
        {isFolderRoute ? (
          <Outlet />
        ) : (
          <div className="vt-welcome">
            <div className="vt-welcome-mark" aria-hidden="true">
              <LuMonitorPlay />
            </div>
            <p className="vt-kicker">Centro audiovisual</p>
            <h2>Selecciona una carpeta</h2>
            <p>
              Elige una categoria del panel lateral para revisar y reproducir
              videos tutoriales.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default VideoTutorials;
