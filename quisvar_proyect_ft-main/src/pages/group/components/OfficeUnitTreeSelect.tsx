import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { MeetingUnitOverviewItem } from '../types/meetingUnitProjects.types';

export type OfficeUnitTreeNode = MeetingUnitOverviewItem & {
  children: OfficeUnitTreeNode[];
  depth: number;
};

type OfficeUnitTreeSelectProps = {
  units: MeetingUnitOverviewItem[];
  value?: string;
  onValueChange: (unitId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
};

const unitTypeOrder: Record<string, number> = {
  GERENCIA: 0,
  OFICINA: 1,
};

const getOfficialCode = (codemap?: string | null) =>
  codemap && /^(?:M\d+|\d+(?:\.\d+)+)$/.test(codemap)
    ? codemap
    : undefined;

const compareUnits = (
  first: MeetingUnitOverviewItem,
  second: MeetingUnitOverviewItem
) => {
  const firstOrder = unitTypeOrder[first.type] ?? 2;
  const secondOrder = unitTypeOrder[second.type] ?? 2;
  if (firstOrder !== secondOrder) return firstOrder - secondOrder;
  return first.name.localeCompare(second.name, 'es');
};

export const buildOfficeUnitForest = (
  units: MeetingUnitOverviewItem[]
): OfficeUnitTreeNode[] => {
  const nodeMap = new Map<string, OfficeUnitTreeNode>();
  units
    .filter(
      unit => Boolean(unit.directoryKey && getOfficialCode(unit.codemap))
    )
    .forEach(unit =>
      nodeMap.set(unit.id, { ...unit, children: [], depth: 0 })
    );

  const roots: OfficeUnitTreeNode[] = [];
  nodeMap.forEach(node => {
    const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const orderNode = (node: OfficeUnitTreeNode, depth: number) => {
    node.depth = depth;
    node.children.sort(compareUnits);
    node.children.forEach(child => orderNode(child, depth + 1));
  };
  roots.sort(compareUnits);
  roots.forEach(root => orderNode(root, 0));
  return roots;
};

const matchesSearch = (node: OfficeUnitTreeNode, search: string): boolean => {
  const normalized = search.trim().toLocaleLowerCase('es');
  if (!normalized) return true;
  const ownText = `${node.name} ${getOfficialCode(node.codemap) || ''}`.toLocaleLowerCase('es');
  return (
    ownText.includes(normalized) ||
    node.children.some(child => matchesSearch(child, search))
  );
};

const nodeLabel = (node: OfficeUnitTreeNode) => node.name;

export const OfficeUnitTreeSelect = ({
  units,
  value,
  onValueChange,
  placeholder = 'Selecciona una unidad',
  disabled = false,
  triggerClassName,
  contentClassName,
}: OfficeUnitTreeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const forest = useMemo(() => buildOfficeUnitForest(units), [units]);
  const flatNodes = useMemo(() => {
    const collect = (node: OfficeUnitTreeNode): OfficeUnitTreeNode[] => [
      node,
      ...node.children.flatMap(collect),
    ];
    return forest.flatMap(collect);
  }, [forest]);
  const nodeById = useMemo(
    () => new Map(flatNodes.map(node => [node.id, node])),
    [flatNodes]
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!forest.length) return;
    setExpandedIds(current => {
      const next = new Set(current);
      forest.forEach(root => next.add(root.id));
      let currentNode = value ? nodeById.get(value) : undefined;
      while (currentNode?.parentId) {
        const parent = nodeById.get(currentNode.parentId);
        if (!parent) break;
        next.add(parent.id);
        currentNode = parent;
      }
      return next;
    });
  }, [forest, nodeById, value]);

  const selectedUnit = value ? nodeById.get(value) : undefined;
  const isSearching = Boolean(search.trim());

  const toggleExpanded = (unitId: string) => {
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const selectUnit = (unitId: string) => {
    onValueChange(unitId);
    setOpen(false);
    setSearch('');
  };

  const renderNode = (node: OfficeUnitTreeNode): ReactNode => {
    if (!matchesSearch(node, search)) return null;
    const isExpanded = isSearching || expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = node.id === value;
    const directAttachedChildren =
      node.depth === 0 && node.type === 'GERENCIA'
        ? node.children.filter(child => child.type !== 'GERENCIA')
        : [];
    const regularChildren =
      directAttachedChildren.length > 0
        ? node.children.filter(child => child.type === 'GERENCIA')
        : node.children;

    return (
      <div key={node.id}>
        <div
          className={`flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-slate-100 ${
            isSelected ? 'bg-blue-50 text-blue-800' : ''
          }`}
          style={{ paddingLeft: `${node.depth * 18 + 4}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200"
              aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${
                node.name
              }`}
              onClick={() => toggleExpanded(node.id)}
            >
              {isExpanded ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm"
            onClick={() => selectUnit(node.id)}
          >
            <Building2
              size={14}
              className={
                node.type === 'GERENCIA' ? 'text-blue-600' : 'text-slate-500'
              }
            />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {getOfficialCode(node.codemap) && (
              <span className="shrink-0 text-[11px] text-slate-400">
                {getOfficialCode(node.codemap)}
              </span>
            )}
            {isSelected && (
              <Check size={15} className="shrink-0 text-blue-700" />
            )}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {regularChildren.map(renderNode)}
            {directAttachedChildren.length > 0 && (
              <div
                className="px-3 pb-1 pt-2"
                style={{ paddingLeft: `${node.depth * 18 + 30}px` }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Unidades adscritas
                </span>
              </div>
            )}
            {directAttachedChildren.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={
            triggerClassName ||
            'flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
          }
        >
          <span className="truncate">
            {selectedUnit ? nodeLabel(selectedUnit) : placeholder}
          </span>
          <ChevronDown size={16} className="ml-2 shrink-0 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={contentClassName || 'w-[min(440px,calc(100vw-2rem))] p-2'}
      >
        <label className="flex items-center gap-2 border-b border-slate-100 px-2 pb-2">
          <Search size={15} className="text-slate-400" />
          <Input
            autoFocus
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar unidad o código oficial..."
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <div className="mt-1 max-h-[min(420px,calc(100vh-12rem))] overflow-y-auto py-1">
          {forest.map(renderNode)}
          {!forest.length && (
            <p className="px-2 py-4 text-sm text-slate-500">
              No hay unidades disponibles.
            </p>
          )}
          {!!forest.length &&
            !forest.some(node => matchesSearch(node, search)) && (
              <p className="px-2 py-4 text-sm text-slate-500">
                No hay coincidencias.
              </p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
