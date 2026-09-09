import { openDialog } from '@/utils/dialog';
import type { Level } from '@/types/types';
import ExpedienteFoliationDialog from './ExpedienteFoliationDialog';

export const openExpedienteFoliationDialog = (level: Level) =>
  openDialog({
    title: `Impresiones — ${level.name}`,
    description: 'Genere el expediente foliado, descárguelo o reimprima páginas.',
    width: '44rem',
    maxHeight: '88vh',
    children: (
      <ExpedienteFoliationDialog
        rootType={level.projectName ? 'stage' : 'level'}
        rootId={level.id}
        rootName={level.name}
      />
    ),
  });
