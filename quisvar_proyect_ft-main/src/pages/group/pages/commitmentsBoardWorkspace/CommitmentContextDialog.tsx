import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  ListChecks,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Level, SubTask } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getMeetingUnitTechnicalProjects,
  getMeetingUnitTechnicalStageTree,
} from '../../services/officeMeetings.service';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import {
  collectTaskIds,
  emptyTechnicalSelection,
  toggleLevelInSelection,
  toggleTaskInSelection,
  type CommitmentTechnicalSelection,
} from './commitmentContextSelection';

type CommitmentContextDialogProps = {
  unitId: string;
  value: CommitmentTechnicalSelection;
  label: string;
  onApply: (selection: CommitmentTechnicalSelection) => void;
  disabled?: boolean;
};

const projectLabel = (focus: MeetingProjectFocus) =>
  focus.project.contract.projectShortName ||
  focus.project.contract.projectName ||
  focus.project.name ||
  focus.project.contract.cui ||
  'Proyecto sin nombre';

const stageOptionsFromProjects = (projects: MeetingProjectFocus[]) =>
  projects.flatMap(focus =>
    (focus.stageFocus ?? [])
      .filter(
        stageFocus => stageFocus.isCurrent && stageFocus.status !== 'INACTIVE'
      )
      .map(stageFocus => ({
        projectId: focus.projectId,
        stageId: stageFocus.stageId,
        projectName: projectLabel(focus),
        stageName: stageFocus.stage.name,
      }))
  );

const selectionCount = (selection: CommitmentTechnicalSelection) =>
  selection.levelIds.length + selection.taskIds.length;

const TaskRow = ({
  task,
  checked,
  onToggle,
}: {
  task: SubTask;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 pl-9 pr-2 text-sm hover:bg-accent">
    <Checkbox checked={checked} onCheckedChange={onToggle} />
    <span className="min-w-0 truncate">
      {[task.item, task.name].filter(Boolean).join(' · ')}
    </span>
  </label>
);

const LevelRow = ({
  level,
  tree,
  selection,
  expanded,
  onToggleExpanded,
  onChange,
  depth = 0,
}: {
  level: Level;
  tree: Level;
  selection: CommitmentTechnicalSelection;
  expanded: Set<number>;
  onToggleExpanded: (levelId: number) => void;
  onChange: (selection: CommitmentTechnicalSelection) => void;
  depth?: number;
}) => {
  const childLevels = level.nextLevel ?? [];
  const tasks = level.subTasks ?? [];
  const hasChildren = childLevels.length > 0 || tasks.length > 0;
  const isExpanded = expanded.has(level.id);
  const descendantTaskIds = collectTaskIds(level);
  const selectedDescendants = descendantTaskIds.filter(taskId =>
    selection.taskIds.includes(taskId)
  ).length;
  const checked =
    selection.levelIds.includes(level.id) ||
    (descendantTaskIds.length > 0 &&
      selectedDescendants === descendantTaskIds.length)
      ? true
      : selectedDescendants > 0
      ? 'indeterminate'
      : false;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-accent"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
          onClick={() => onToggleExpanded(level.id)}
          aria-label={isExpanded ? 'Contraer nivel' : 'Expandir nivel'}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )
          ) : (
            <span className="size-4" />
          )}
        </button>
        <Checkbox
          checked={checked}
          onCheckedChange={() =>
            onChange(toggleLevelInSelection(tree, selection, level.id))
          }
          aria-label={`Seleccionar nivel ${level.name}`}
        />
        <FolderTree className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate font-medium">
          {[level.item, level.name].filter(Boolean).join(' · ')}
        </span>
      </div>
      {isExpanded && (
        <div style={{ paddingLeft: `${depth * 16}px` }}>
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              checked={selection.taskIds.includes(task.id)}
              onToggle={() =>
                onChange(toggleTaskInSelection(tree, selection, task.id))
              }
            />
          ))}
          {childLevels.map(child => (
            <LevelRow
              key={child.id}
              level={child}
              tree={tree}
              selection={selection}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommitmentContextDialog = ({
  unitId,
  value,
  label,
  onApply,
  disabled = false,
}: CommitmentContextDialogProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CommitmentTechnicalSelection>(value);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const projectsQuery = useQuery({
    queryKey: ['meeting-unit-technical-projects', unitId, 'self', false],
    queryFn: () =>
      getMeetingUnitTechnicalProjects(unitId, {
        scope: 'self',
        includeInactive: false,
      }),
    enabled: open,
  });
  const stageOptions = useMemo(
    () => stageOptionsFromProjects(projectsQuery.data ?? []),
    [projectsQuery.data]
  );
  const selectedStage = stageOptions.find(
    option =>
      option.projectId === draft.projectId && option.stageId === draft.stageId
  );
  const treeQuery = useQuery({
    queryKey: [
      'meeting-unit-technical-stage-tree',
      unitId,
      draft.projectId,
      draft.stageId,
    ],
    queryFn: () =>
      getMeetingUnitTechnicalStageTree({
        unitId,
        projectId: draft.projectId as number,
        stageId: draft.stageId as number,
      }),
    enabled: open && Boolean(draft.projectId && draft.stageId),
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...value,
      levelIds: [...value.levelIds],
      taskIds: [...value.taskIds],
    });
  }, [open, value]);

  useEffect(() => {
    if (!treeQuery.data) return;
    setExpanded(new Set([treeQuery.data.id]));
  }, [treeQuery.data]);

  const handleStageChange = (value: string) => {
    const [projectId, stageId] = value.split(':').map(Number);
    const option = stageOptions.find(
      current => current.projectId === projectId && current.stageId === stageId
    );
    setDraft({
      projectId,
      stageId,
      projectName: option?.projectName ?? null,
      stageName: option?.stageName ?? null,
      levelIds: [],
      taskIds: [],
    });
  };

  const handleClear = () => {
    onApply(emptyTechnicalSelection());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="cb-contextChip cb-contextChipButton"
          disabled={disabled}
        >
          <ListChecks className="mr-1 size-3.5 shrink-0" />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,760px)]">
        <DialogHeader>
          <DialogTitle>Contexto del compromiso</DialogTitle>
          <DialogDescription>
            Elige una etapa asignada a la unidad y marca los niveles o tareas
            relacionados.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            Etapa
            <Select
              value={
                draft.projectId && draft.stageId
                  ? `${draft.projectId}:${draft.stageId}`
                  : undefined
              }
              onValueChange={handleStageChange}
            >
              <SelectTrigger aria-label="Etapa del contexto">
                <SelectValue
                  placeholder={
                    projectsQuery.isLoading
                      ? 'Cargando etapas...'
                      : 'Seleccionar etapa'
                  }
                />
              </SelectTrigger>
              <SelectContent className="z-[calc(var(--z-modal)+1)]">
                {stageOptions.map(option => (
                  <SelectItem
                    key={`${option.projectId}:${option.stageId}`}
                    value={`${option.projectId}:${option.stageId}`}
                  >
                    {option.projectName} — {option.stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {projectsQuery.isError && (
            <p className="rounded-md bg-danger-muted p-3 text-sm text-danger-foreground">
              No se pudieron cargar las etapas de la unidad.
            </p>
          )}
          {!projectsQuery.isLoading &&
            !projectsQuery.isError &&
            !stageOptions.length && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Esta unidad no tiene etapas técnicas activas asignadas.
              </p>
            )}
          {draft.stageId &&
            !selectedStage &&
            !projectsQuery.isLoading &&
            stageOptions.length > 0 && (
              <p className="rounded-md bg-warning-muted p-3 text-sm text-warning-foreground">
                El contexto actual pertenece a una etapa que ya no está
                disponible. Elige una etapa activa para reemplazarlo.
              </p>
            )}

          {treeQuery.isLoading && (
            <div className="grid gap-2">
              {[1, 2, 3, 4].map(item => (
                <div
                  key={item}
                  className="h-9 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          )}
          {treeQuery.isError && (
            <p className="rounded-md bg-danger-muted p-3 text-sm text-danger-foreground">
              No se pudo cargar el índice de la etapa seleccionada.
            </p>
          )}
          {treeQuery.data && (
            <div className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">Índice técnico</span>
                <span className="text-xs text-muted-foreground">
                  {selectionCount(draft)} seleccionados
                </span>
              </div>
              <ScrollArea className="h-[min(46vh,420px)]">
                <div className="p-2">
                  <LevelRow
                    level={treeQuery.data}
                    tree={treeQuery.data}
                    selection={draft}
                    expanded={expanded}
                    onToggleExpanded={levelId =>
                      setExpanded(current => {
                        const next = new Set(current);
                        if (next.has(levelId)) next.delete(levelId);
                        else next.add(levelId);
                        return next;
                      })
                    }
                    onChange={setDraft}
                  />
                </div>
              </ScrollArea>
            </div>
          )}
          {treeQuery.data &&
            !collectTaskIds(treeQuery.data).length &&
            !(treeQuery.data.nextLevel ?? []).length && (
              <p className="text-sm text-muted-foreground">
                La etapa seleccionada todavía no tiene niveles o tareas.
              </p>
            )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={disabled}
          >
            Quitar contexto
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
              disabled={
                disabled ||
                !selectedStage ||
                !selectionCount(draft) ||
                treeQuery.isLoading
              }
            >
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
