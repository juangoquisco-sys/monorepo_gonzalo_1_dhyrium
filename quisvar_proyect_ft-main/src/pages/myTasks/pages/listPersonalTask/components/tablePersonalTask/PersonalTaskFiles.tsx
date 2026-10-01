import { useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import type { FileTask } from '@/types/types';
import {
  isDhyriumDesktopEnabled,
  openWithDhyriumDesktop,
  reportDesktopOpenError,
} from '@/services/desktopConnector.service';
import {
  getTaskFileExtension,
  getTaskFileUrl,
} from '@/pages/specialities/pages/project/pages/task/services/taskFile.service';
import { downloadHref } from '@/utils/tools';

const icons: Record<string, string> = {
  docx: 'word-icon',
  xlsx: 'excel-icon',
  pdf: 'pdf-icon',
  dwg: 'autocad-icon',
};

export default function PersonalTaskFiles({
  files,
  taskName,
}: {
  files: FileTask[];
  taskName: string;
}) {
  const [openingId, setOpeningId] = useState<number | null>(null);
  const desktopEnabled = isDhyriumDesktopEnabled();

  const openFile = async (file: FileTask) => {
    if (!desktopEnabled) {
      downloadHref(getTaskFileUrl(file), file.originalname || file.name, true);
      return;
    }
    setOpeningId(file.id);
    try {
      await openWithDhyriumDesktop({
        sourceKind: 'TASK_FILE',
        sourceFileId: file.id,
      });
    } catch (error) {
      reportDesktopOpenError(error);
    } finally {
      setOpeningId(null);
    }
  };

  if (!files.length) return null;

  return (
    <ul
      aria-label={`Archivos entregables de ${taskName}`}
      className="mt-2 flex list-none flex-col items-start gap-1 border-t border-border pt-1 pl-4"
    >
      {files.map(file => {
        const name = file.originalname || file.name;
        const label = desktopEnabled
          ? `Abrir ${name} con Dhyrium Desktop`
          : `Abrir ${name}`;
        return (
          <li key={file.id} className="w-full min-w-0">
            <AppButton
              type="button"
              variant="ghost"
              size="xs"
              className="h-auto max-w-full justify-start py-1 text-left font-normal whitespace-normal text-primary"
              title={label}
              aria-label={label}
              disabled={openingId !== null}
              onClick={event => {
                event.stopPropagation();
                void openFile(file);
              }}
            >
              <img
                src={`/svg/${
                  icons[getTaskFileExtension(file)] ?? 'file-download'
                }.svg`}
                className="size-4 shrink-0"
                alt=""
                aria-hidden="true"
              />
              <span className="break-all">
                {openingId === file.id ? `Abriendo ${name}…` : name}
              </span>
            </AppButton>
          </li>
        );
      })}
    </ul>
  );
}
