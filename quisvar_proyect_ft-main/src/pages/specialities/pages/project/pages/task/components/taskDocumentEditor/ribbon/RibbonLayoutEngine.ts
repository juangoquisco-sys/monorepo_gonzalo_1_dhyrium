import { useEffect, useRef, useState, type RefObject } from 'react';

import type { RibbonGroup, RibbonLayoutMode } from './ribbonTypes';

export type RibbonLayout = Record<string, RibbonLayoutMode>;

export class RibbonLayoutEngine {
  calculate(availableWidth: number, groups: RibbonGroup[], measuredWidths: Map<string, number>) {
    const layout: RibbonLayout = Object.fromEntries(groups.map(group => [group.id, 'full']));
    const widthFor = (group: RibbonGroup, mode: RibbonLayoutMode) => {
      if (mode === 'overflow') return 0;
      if (mode === 'full') {
        return Math.max(measuredWidths.get(group.id) ?? 0, group.preferredWidths.full);
      }
      return group.preferredWidths[mode];
    };
    const total = () => groups.reduce((sum, group) => sum + widthFor(group, layout[group.id]), 0);
    const candidates = [...groups].sort((left, right) => left.priority - right.priority);

    for (const nextMode of ['compact', 'collapsed', 'overflow'] as const) {
      for (const group of candidates) {
        if (total() <= availableWidth) break;
        if (nextMode === 'overflow' && !group.canOverflow) continue;
        layout[group.id] = nextMode;
      }
    }
    return layout;
  }
}

const sameLayout = (left: RibbonLayout, right: RibbonLayout) =>
  Object.keys(left).length === Object.keys(right).length &&
  Object.entries(left).every(([key, value]) => right[key] === value);

export const useRibbonLayoutEngine = (
  containerRef: RefObject<HTMLElement | null>,
  groups: RibbonGroup[],
  enabled: boolean
) => {
  const engineRef = useRef(new RibbonLayoutEngine());
  const measuredWidthsRef = useRef(new Map<string, number>());
  const [layout, setLayout] = useState<RibbonLayout>(() =>
    Object.fromEntries(groups.map(group => [group.id, 'full']))
  );

  useEffect(() => {
    if (!enabled || !containerRef.current || typeof ResizeObserver === 'undefined') return;
    const container = containerRef.current;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        container.querySelectorAll<HTMLElement>('[data-ribbon-group-id]').forEach(element => {
          const id = element.dataset.ribbonGroupId;
          if (!id || element.dataset.ribbonMode !== 'full') return;
          measuredWidthsRef.current.set(
            id,
            Math.max(measuredWidthsRef.current.get(id) ?? 0, element.getBoundingClientRect().width)
          );
        });
        const reservedForOverflow = 52;
        const next = engineRef.current.calculate(
          Math.max(0, container.clientWidth - reservedForOverflow),
          groups,
          measuredWidthsRef.current
        );
        setLayout(previous => sameLayout(previous, next) ? previous : next);
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, enabled, groups]);

  return layout;
};

