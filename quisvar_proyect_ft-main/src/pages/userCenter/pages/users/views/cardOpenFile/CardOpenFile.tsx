import './CardOpenFile.css';
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FolderOpen } from 'lucide-react';
import { isOpenCardFiles$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';
import { URL } from '@/services/axiosInstance';
import ButtonDelete from '@/components/button/ButtonDelete';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Modal from '@/components/portal/Modal';
import UploadFile from '@/components/uploadFile/UploadFile';
import useDirectives from '@/hooks/useDirectives';
import { formatDateTimeWeekdayUtc } from '@/utils/dayjsSpanish';

const NEW_DIRECTIVE_DAYS = 7;
const SKELETON_ROWS = 3;

const getFileExtension = (name: string) => {
  const extension = name.split('.').pop();
  return extension && extension !== name ? extension.toUpperCase() : 'PDF';
};

const formatDirectiveName = (name: string) =>
  name
    .replace(/\.[^/.]+$/, '')
    .replace(/_/g, ' ')
    .trim();

const isNewDirective = (createdAt: string | Date) => {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return false;

  const sevenDaysAgo = Date.now() - NEW_DIRECTIVE_DAYS * 24 * 60 * 60 * 1000;
  return createdDate.getTime() >= sevenDaysAgo;
};

const CardOpenFile = () => {
  const directivesQuery = useDirectives();

  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const handleIsOpen = useRef<Subscription>(new Subscription());

  const getGeneralFiles = () => {
    directivesQuery.refetch();
  };
  const closeFunctions = () => setIsOpen(false);

  useEffect(() => {
    handleIsOpen.current = isOpenCardFiles$.getSubject.subscribe(
      ({ isOpen, isAdmin = false }) => {
        setIsOpen(isOpen);
        setIsAdmin(isAdmin);
      }
    );
    return () => handleIsOpen.current.unsubscribe();
  }, []);

  const directives = directivesQuery.data ?? [];
  const showInitialSkeleton =
    directivesQuery.isFetching && directives.length === 0;

  return (
    <Modal size={48} isOpenProp={isOpen} contentClassName="directives-modal">
      <div className="card-register-users directives-card">
        <CloseIcon
          onClick={closeFunctions}
          className="directives-close"
          size={0.95}
        />
        <header className="directives-header">
          <div>
            <span className="directives-eyebrow">Archivo normativo</span>
            <h1>Directivas</h1>
          </div>
          <span className="directives-count">
            {directives.length}{' '}
            {directives.length === 1 ? 'documento' : 'documentos'}
          </span>
        </header>

        {isAdmin && (
          <div className="col-input card-open-file-main directives-upload">
            <div className="card-open-file-contain">
              <UploadFile
                text="Subir directiva"
                onSave={getGeneralFiles}
                uploadName="generalFile"
                URL={`/files/uploadGeneralFiles`}
                className="userList-upload"
              />
            </div>
          </div>
        )}

        <div className="card-open-files-contain">
          {showInitialSkeleton &&
            Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <article
                key={`directive-skeleton-${index}`}
                className="subtaskFile-contain directive-row directive-row-skeleton"
                aria-hidden="true"
              >
                <span className="directive-skeleton-icon" />
                <span className="directive-skeleton-copy">
                  <span className="directive-skeleton-line directive-skeleton-line-name" />
                  <span className="directive-skeleton-line directive-skeleton-line-date" />
                </span>
                <span className="directive-skeleton-pill" />
                <span className="directive-skeleton-action" />
              </article>
            ))}

          {!directivesQuery.isFetching && directives.length === 0 && (
            <div className="directives-empty">
              <FolderOpen />
              <p>No hay directivas disponibles.</p>
            </div>
          )}

          {directives.map(file => {
            const directiveName = formatDirectiveName(file.name);
            const isNew = isNewDirective(file.createdAt);

            return (
              <article
                key={file.id}
                className="subtaskFile-contain directive-row"
              >
                <a
                  href={`${URL}/${file.dir}`}
                  target="_blank"
                  className="subtaskFile-anchor"
                  download={true}
                  rel="noreferrer"
                  title={directiveName}
                >
                  <span className="directive-filemark" aria-hidden="true">
                    <FileText />
                  </span>
                  <div className="card-openfile-info">
                    <span className="card-openfile-title">
                      <span className="card-openfile-name">
                        {directiveName}
                      </span>
                      {isNew && (
                        <span className="directive-new-badge">Nuevo</span>
                      )}
                    </span>
                    <span className="card-openfile-date">
                      {formatDateTimeWeekdayUtc(file.createdAt)}
                    </span>
                  </div>
                  <span className="directive-meta">
                    {getFileExtension(file.name)}
                  </span>
                  <span className="directive-download" aria-hidden="true">
                    <Download />
                  </span>
                </a>

                {isAdmin && (
                  <ButtonDelete
                    icon="trash-red"
                    onSave={getGeneralFiles}
                    url={`/files/generalFiles/${file.id}`}
                    className="subtaskFile-btn-delete"
                  />
                )}
              </article>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default CardOpenFile;
