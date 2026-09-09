import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ClipboardList,
  FileText,
  LayoutGrid,
  PanelLeft,
  PanelTop,
  Square,
  type LucideIcon,
} from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import { AppButton } from '@/components/app-ui/app-button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSpecialityPanelLayout } from '@/pages/specialities/contexts/SpecialityPanelLayoutContext';
import { TaskWorkspacePanelsContext } from '@/pages/specialities/contexts/TaskWorkspacePanelsContext';
import type { TaskWorkspaceLowerPanel } from '@/pages/specialities/contexts/TaskWorkspacePanelsContext';
import type { FileTask } from '@/types/types';

type WorkspacePanel = 1 | 2 | 3 | 4 | 5;

interface TaskWorkspaceSplitProps {
  enabled: boolean;
  storageId: string;
  upperContent: ReactNode;
  lowerContent: ReactNode;
}

const DEFAULT_PANELS: WorkspacePanel[] = [1, 2, 4];
const VALID_PANELS = new Set<WorkspacePanel>([1, 2, 3, 4, 5]);

const PANEL_OPTIONS: ReadonlyArray<{
  value: WorkspacePanel;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 1,
    label: 'Panel 1 · Proyectos',
    description: 'Barra lateral con proyectos y etapas',
    icon: PanelLeft,
  },
  {
    value: 2,
    label: 'Panel 2 · Tabla de tareas',
    description: 'Hoja superior de presupuesto y tareas',
    icon: PanelTop,
  },
  {
    value: 3,
    label: 'Panel 3 · Editor Word',
    description: 'Documento editable de la tarea',
    icon: FileText,
  },
  {
    value: 4,
    label: 'Panel 4 · Funciones de tarea',
    description: 'Entregables, responsables, estado y archivos',
    icon: ClipboardList,
  },
  {
    value: 5,
    label: 'Panel 5 · En blanco',
    description: 'Espacio libre para una función futura',
    icon: Square,
  },
];

const PANEL_PRESETS: ReadonlyArray<{
  label: string;
  description: string;
  panels: WorkspacePanel[];
}> = [
  {
    label: 'Trabajo con Word',
    description: 'Paneles 1 + 2 + 3',
    panels: [1, 2, 3],
  },
  {
    label: 'Trabajo con funciones',
    description: 'Paneles 1 + 2 + 4',
    panels: [1, 2, 4],
  },
  {
    label: 'Word y panel libre',
    description: 'Paneles 3 + 5',
    panels: [3, 5],
  },
  {
    label: 'Funciones y panel libre',
    description: 'Paneles 4 + 5',
    panels: [4, 5],
  },
  {
    label: 'Mostrar los cinco',
    description: 'Paneles 1 + 2 + 3 + 4 + 5',
    panels: [1, 2, 3, 4, 5],
  },
];

const isWorkspacePanel = (value: unknown): value is WorkspacePanel =>
  typeof value === 'number' && VALID_PANELS.has(value as WorkspacePanel);

const normalizePanels = (value: unknown): WorkspacePanel[] => {
  if (!Array.isArray(value)) return DEFAULT_PANELS;
  const panels = [...new Set(value.filter(isWorkspacePanel))].sort(
    (a, b) => a - b
  );
  return panels.length ? panels : DEFAULT_PANELS;
};

const getStoredPanels = (storageId: string): WorkspacePanel[] => {
  try {
    const value = window.localStorage.getItem(
      `${storageId}:selected-panels-v2`
    );
    return value ? normalizePanels(JSON.parse(value)) : DEFAULT_PANELS;
  } catch {
    return DEFAULT_PANELS;
  }
};

const persistPanels = (storageId: string, panels: WorkspacePanel[]) => {
  try {
    window.localStorage.setItem(
      `${storageId}:selected-panels-v2`,
      JSON.stringify(panels)
    );
  } catch {
    // La preferencia visual puede funcionar durante la sesion sin persistencia.
  }
};

const LayoutPreview = ({ panels }: { panels: WorkspacePanel[] }) => {
  const hasPanel = (panel: WorkspacePanel) => panels.includes(panel);

  return (
    <span
      className="grid h-10 w-16 shrink-0 grid-cols-[0.7fr_repeat(3,1fr)] grid-rows-2 gap-0.5 rounded border border-border bg-muted p-0.5"
      aria-hidden="true"
    >
      <span
        className={cn(
          'row-span-2 rounded-[2px] border',
          hasPanel(1)
            ? 'border-sky-500/60 bg-sky-500/20'
            : 'border-dashed border-muted-foreground/25 bg-background'
        )}
      />
      <span
        className={cn(
          'col-span-3 rounded-[2px] border',
          hasPanel(2)
            ? 'border-primary/60 bg-primary/20'
            : 'border-dashed border-muted-foreground/25 bg-background'
        )}
      />
      {[3, 4, 5].map(panel => (
        <span
          key={panel}
          className={cn(
            'rounded-[2px] border',
            hasPanel(panel as WorkspacePanel)
              ? panel === 3
                ? 'border-indigo-500/60 bg-indigo-500/20'
                : panel === 4
                  ? 'border-amber-500/60 bg-amber-500/20'
                  : 'border-emerald-500/60 bg-emerald-500/10'
              : 'border-dashed border-muted-foreground/25 bg-background'
          )}
        />
      ))}
    </span>
  );
};

const RowResizeHandle = () => (
  <PanelResizeHandle
    className="group relative flex h-2 shrink-0 cursor-row-resize touch-none select-none items-center justify-center border-y border-border bg-muted/70 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[resize-handle-active]:bg-accent"
    aria-label="Cambiar la altura entre los paneles"
  >
    <span className="h-1 w-14 rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary group-focus-visible:bg-primary group-data-[resize-handle-active]:bg-primary" />
  </PanelResizeHandle>
);

const ContentPanel = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full min-h-0 min-w-0 flex-col">{children}</div>
);

const TaskWorkspaceSplit = ({
  enabled,
  storageId,
  upperContent,
  lowerContent,
}: TaskWorkspaceSplitProps) => {
  const { setSidebarPanelVisible } = useSpecialityPanelLayout();
  const [selectedPanels, setSelectedPanels] = useState<WorkspacePanel[]>(() =>
    getStoredPanels(storageId)
  );
  const [openedEditableFile, setOpenedEditableFile] = useState<{
    taskId: number;
    file: FileTask;
  } | null>(null);

  const selectedPanelText = useMemo(
    () => selectedPanels.join(' + '),
    [selectedPanels]
  );

  useEffect(() => {
    const synchronization = window.setTimeout(() => {
      setSidebarPanelVisible(!enabled || selectedPanels.includes(1));
    }, 0);
    return () => window.clearTimeout(synchronization);
  }, [enabled, selectedPanels, setSidebarPanelVisible]);

  useEffect(
    () => () => {
      // Al cambiar de ruta React puede desmontar este árbol mientras el padre
      // todavía calcula su siguiente composición. Diferir la restauración
      // evita actualizar Sidebar durante el render de TaskWorkspaceSplit.
      window.setTimeout(() => setSidebarPanelVisible(true), 0);
    },
    [setSidebarPanelVisible]
  );

  const changePanels = useCallback(
    (nextPanels: WorkspacePanel[]) => {
      const normalized = normalizePanels(nextPanels);
      setSelectedPanels(normalized);
      persistPanels(storageId, normalized);
    },
    [storageId]
  );

  const activateLowerPanel = useCallback(
    (panel: TaskWorkspaceLowerPanel) => {
      setSelectedPanels(currentPanels => {
        const fixedPanels = currentPanels.filter(value => value === 1 || value === 2);
        const normalized = normalizePanels([...fixedPanels, panel]);
        persistPanels(storageId, normalized);
        return normalized;
      });
    },
    [storageId]
  );

  const openEditableFile = useCallback(
    (taskId: number, file: FileTask) => {
      setOpenedEditableFile({ taskId, file });
      activateLowerPanel(3);
    },
    [activateLowerPanel]
  );

  const panelVisibility = useMemo(
    () => ({
      showEditor: selectedPanels.includes(3),
      showTaskDetails: selectedPanels.includes(4),
      showBlankPanel: selectedPanels.includes(5),
      activateLowerPanel,
      openedEditableFile,
      openEditableFile,
    }),
    [activateLowerPanel, openEditableFile, openedEditableFile, selectedPanels]
  );

  const togglePanel = (panel: WorkspacePanel) => {
    const nextPanels = selectedPanels.includes(panel)
      ? selectedPanels.filter(value => value !== panel)
      : [...selectedPanels, panel];

    if (!nextPanels.length) return;
    changePanels(nextPanels);
  };

  if (!enabled) {
    return (
      <TaskWorkspacePanelsContext.Provider value={panelVisibility}>
        {upperContent}
        {lowerContent}
      </TaskWorkspacePanelsContext.Provider>
    );
  }

  const showUpperPanel = selectedPanels.includes(2);
  const showLowerPanels =
    panelVisibility.showEditor ||
    panelVisibility.showTaskDetails ||
    panelVisibility.showBlankPanel;
  const panelTwo = <ContentPanel>{upperContent}</ContentPanel>;
  const taskPanels = <ContentPanel>{lowerContent}</ContentPanel>;

  const panelContent = (() => {
    if (showUpperPanel && !showLowerPanels) return panelTwo;
    if (!showUpperPanel && showLowerPanels) return taskPanels;
    if (!showUpperPanel && !showLowerPanels) {
      return (
        <div className="h-full min-h-0 flex-1 bg-background" aria-hidden="true" />
      );
    }

    return (
      <PanelGroup
        autoSaveId={`${storageId}-panels-${selectedPanelText.replaceAll(' ', '')}`}
        direction="vertical"
        className="min-h-0 flex-1"
      >
        <Panel
          defaultSize={52}
          minSize={20}
          order={1}
          className="flex min-h-0 flex-col"
        >
          {panelTwo}
        </Panel>
        <RowResizeHandle />
        <Panel
          defaultSize={48}
          minSize={25}
          order={2}
          className="flex min-h-0 flex-col"
        >
          {taskPanels}
        </Panel>
      </PanelGroup>
    );
  })();

  return (
    <TaskWorkspacePanelsContext.Provider value={panelVisibility}>
      <div className="fixed right-5 top-5 z-[var(--z-navigation)]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AppButton
              type="button"
              size="sm"
              variant="outline"
              className="min-w-32 justify-between bg-background shadow-app-panel"
              aria-label="Configurar los cinco paneles"
            >
              <span className="flex items-center gap-1.5">
                <LayoutGrid aria-hidden="true" />
                Paneles
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {selectedPanelText}
              </span>
            </AppButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 p-1.5">
            <DropdownMenuLabel className="flex items-center gap-3 px-2 pb-1 pt-1.5">
              <LayoutPreview panels={selectedPanels} />
              <span>
                Editor de paneles
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Activa cualquier combinación de las cinco ventanas
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PANEL_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedPanels.includes(option.value)}
                  onCheckedChange={() => togglePanel(option.value)}
                  onSelect={event => event.preventDefault()}
                  className="items-center gap-2 py-2 pl-8"
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[0.68rem] leading-tight text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[0.68rem] uppercase tracking-wide text-muted-foreground">
              Configuraciones rápidas
            </DropdownMenuLabel>
            {PANEL_PRESETS.map(preset => (
              <DropdownMenuItem
                key={preset.label}
                onSelect={() => changePanels(preset.panels)}
                className="flex items-center gap-3 py-2"
              >
                <LayoutPreview panels={preset.panels} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">
                    {preset.label}
                  </span>
                  <span className="block text-[0.68rem] text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {panelContent}
    </TaskWorkspacePanelsContext.Provider>
  );
};

export default TaskWorkspaceSplit;
