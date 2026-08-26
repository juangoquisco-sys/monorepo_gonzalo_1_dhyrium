import { FileCheck2, FileText, Files, LogOut } from 'lucide-react';

import { AppBadge } from '@/components/app-ui/app-badge';
import type { TypeFileUser, User } from '@/types/types';

import UploadUserFile from '../../components/uploadUserFile/UploadUserFile';

interface UserDocumentsSectionProps {
  user: User;
  onUserRefresh?: () => void | Promise<void>;
}

type DocumentGroup = {
  typeFile: TypeFileUser;
  title: string;
  fileNames: string[];
  allowsMultipleFiles: boolean;
  icon: typeof FileText;
};

type DocumentSection = {
  title: string;
  description: string;
  documentGroups: DocumentGroup[];
};

const getFileStatus = (fileCount: number, allowsMultipleFiles: boolean) => {
  if (fileCount === 0) {
    return 'Pendiente';
  }

  const fileLabel = fileCount === 1 ? 'archivo' : 'archivos';

  return allowsMultipleFiles
    ? `${fileCount} ${fileLabel}`
    : 'Registrado';
};

const getDocumentGroups = (user: User): DocumentGroup[] => [
  {
    typeFile: 'cv',
    title: 'Curriculum vitae',
    fileNames: user.cv ? [user.cv] : [],
    allowsMultipleFiles: false,
    icon: FileText,
  },
  {
    typeFile: 'declaration',
    title: 'Declaración jurada',
    fileNames: user.declaration ? [user.declaration] : [],
    allowsMultipleFiles: false,
    icon: FileCheck2,
  },
  {
    typeFile: 'contract',
    title: 'Historial de contratos',
    fileNames: user.contract ?? [],
    allowsMultipleFiles: true,
    icon: Files,
  },
  {
    typeFile: 'withdrawalDeclaration',
    title: 'Declaración jurada al retirarse',
    fileNames: user.withdrawalDeclaration ? [user.withdrawalDeclaration] : [],
    allowsMultipleFiles: false,
    icon: LogOut,
  },
];

const getDocumentSections = (user: User): DocumentSection[] => {
  const [curriculum, declaration, contracts, withdrawalDeclaration] =
    getDocumentGroups(user);

  return [
    {
      title: 'Documentos personales',
      description: 'Perfil y declaración vigente.',
      documentGroups: [curriculum, declaration],
    },
    {
      title: 'Documentos laborales',
      description: 'Contratos y documentación de salida.',
      documentGroups: [contracts, withdrawalDeclaration],
    },
  ];
};

const UserDocumentsSection = ({
  user,
  onUserRefresh,
}: UserDocumentsSectionProps) => {
  const documentSections = getDocumentSections(user);
  const registeredFiles = documentSections
    .flatMap(documentSection => documentSection.documentGroups)
    .reduce(
      (total, documentGroup) => total + documentGroup.fileNames.length,
      0
    );

  const handleUserRefresh = () => {
    void onUserRefresh?.();
  };

  return (
    <section aria-labelledby="user-documents-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="user-documents-title"
            className="text-base font-semibold text-foreground"
          >
            Expediente
          </h2>
          <p className="text-sm text-muted-foreground">
            Consulte, descargue o actualice los archivos del usuario.
          </p>
        </div>
        <AppBadge variant={registeredFiles > 0 ? 'success' : 'outline'}>
          {registeredFiles === 1
            ? '1 archivo registrado'
            : `${registeredFiles} archivos registrados`}
        </AppBadge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {documentSections.map(documentSection => {
          const sectionFileCount = documentSection.documentGroups.reduce(
            (total, documentGroup) => total + documentGroup.fileNames.length,
            0
          );

          return (
            <section
              key={documentSection.title}
              aria-label={documentSection.title}
              className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {documentSection.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {documentSection.description}
                  </p>
                </div>
                <AppBadge
                  variant={sectionFileCount > 0 ? 'success' : 'outline'}
                >
                  {sectionFileCount === 1
                    ? '1 archivo'
                    : `${sectionFileCount} archivos`}
                </AppBadge>
              </header>

              <ul className="divide-y divide-border">
                {documentSection.documentGroups.map(documentGroup => {
                  const Icon = documentGroup.icon;
                  const hasFiles = documentGroup.fileNames.length > 0;
                  const showUploader =
                    documentGroup.allowsMultipleFiles || !hasFiles;

                  return (
                    <li
                      key={documentGroup.typeFile}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(10rem,0.8fr)_auto_minmax(14rem,1.45fr)] md:items-start"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon aria-hidden="true" className="size-3.5" />
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {documentGroup.title}
                        </span>
                      </div>

                      <AppBadge
                        className="w-fit"
                        variant={hasFiles ? 'success' : 'outline'}
                      >
                        {getFileStatus(
                          documentGroup.fileNames.length,
                          documentGroup.allowsMultipleFiles
                        )}
                      </AppBadge>

                      <div className="min-w-0 space-y-1.5">
                        {hasFiles ? (
                          <div
                            className="space-y-1"
                            aria-label={documentGroup.title}
                          >
                            {documentGroup.fileNames.map(fileName => (
                              <UploadUserFile
                                key={fileName}
                                fileName={fileName}
                                typeFile={documentGroup.typeFile}
                                userId={user.id}
                                onSave={handleUserRefresh}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Pendiente de carga
                          </p>
                        )}

                        {showUploader && (
                          <UploadUserFile
                            fileName=""
                            typeFile={documentGroup.typeFile}
                            userId={user.id}
                            onSave={handleUserRefresh}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
};

export default UserDocumentsSection;
