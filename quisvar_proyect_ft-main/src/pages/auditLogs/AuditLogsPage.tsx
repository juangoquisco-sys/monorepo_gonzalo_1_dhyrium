import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
  type WheelEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { useSystemHeaderAction } from '../system/SystemHeaderActionContext';
import { AuditLogDetailSheet } from './components/AuditLogDetailSheet';
import { AuditLogInsights } from './components/AuditLogInsights';
import { AuditLogStatsCards } from './components/AuditLogStatsCards';
import { AuditLogsTable } from './components/AuditLogsTable';
import { useAuditLogs, useAuditSummary } from './hooks/useAuditLogs';
import type {
  AuditLogCursor,
  AuditLogFilters as AuditLogFiltersType,
  AuditTimeUnit,
} from './models/auditLogs.types';

type AuditTab = 'all' | 'critical' | 'errors' | 'security';
type AuditSection = 'summary' | 'logs';

const INITIAL_FILTERS: AuditLogFiltersType = {
  limit: 25,
};

const tabFilters: Record<
  AuditTab,
  Partial<Pick<AuditLogFiltersType, 'severity' | 'module'>>
> = {
  all: { severity: undefined, module: undefined },
  critical: { severity: ['CRITICAL'], module: undefined },
  errors: { severity: ['ERROR'], module: undefined },
  security: { severity: undefined, module: ['Centro de usuarios', 'Usuarios'] },
};

const matchesOnly = (values: string[] | undefined, expected: string) =>
  values?.length === 1 && values[0] === expected;

const matchesSet = (values: string[] | undefined, expected: string[]) =>
  values?.length === expected.length &&
  expected.every(value => values.includes(value));

const resolveTabFromFilters = (filters: AuditLogFiltersType): AuditTab => {
  if (matchesOnly(filters.severity, 'CRITICAL') && !filters.module?.length) {
    return 'critical';
  }
  if (matchesOnly(filters.severity, 'ERROR') && !filters.module?.length) {
    return 'errors';
  }
  if (
    matchesSet(filters.module, ['Centro de usuarios', 'Usuarios']) &&
    !filters.severity?.length
  ) {
    return 'security';
  }
  return 'all';
};

const isInteractiveScrollTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('[data-slot="table-container"]') ||
      target.closest('[data-slot="popover-content"]') ||
      target.closest('[data-slot="dropdown-menu-content"]')
  );
};

const canScrollElement = (element: HTMLElement, direction: 'up' | 'down') => {
  if (direction === 'up') return element.scrollTop > 0;
  return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
};

const hasOpenFloatingContent = () =>
  Boolean(
    document.querySelector('[data-slot="popover-content"]') ||
      document.querySelector('[data-slot="dropdown-menu-content"]')
  );

const AuditLogsPage = () => {
  const [filters, setFilters] = useState<AuditLogFiltersType>(INITIAL_FILTERS);
  const [activeTab, setActiveTab] = useState<AuditTab>('all');
  const [activeSection, setActiveSection] = useState<AuditSection>('summary');
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [timeUnit, setTimeUnit] = useState<AuditTimeUnit>('ms');
  const pageShellRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const logsSectionRef = useRef<HTMLElement | null>(null);
  const sectionScrollLockRef = useRef(false);
  const sectionScrollTimeoutRef = useRef<number | null>(null);

  const logsQuery = useAuditLogs(filters);
  const responseSnapshotAt = logsQuery.isPlaceholderData
    ? undefined
    : logsQuery.data?.meta.snapshotAt;
  const snapshotAt = filters.snapshotAt || responseSnapshotAt;
  const summaryFilters = useMemo(
    () => ({
      ...filters,
      snapshotAt,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      cursorSortValue: undefined,
      direction: undefined,
      limit: 25,
    }),
    [filters, snapshotAt]
  );
  const summaryQuery = useAuditSummary(summaryFilters);
  const logs = logsQuery.data?.data || [];
  const isPresetUpdating =
    (logsQuery.isFetching && !logsQuery.isLoading) ||
    (summaryQuery.isFetching && !summaryQuery.isLoading);

  const modules = useMemo(
    () => summaryQuery.data?.topModules.map(item => item.module) || [],
    [summaryQuery.data?.topModules]
  );

  const updateFilters = useCallback((nextFilters: AuditLogFiltersType) => {
    setFilters({
      ...nextFilters,
      snapshotAt: undefined,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      cursorSortValue: undefined,
      direction: undefined,
    });
    setActiveTab(resolveTabFromFilters(nextFilters));
  }, []);

  const changeTab = useCallback((value: string) => {
    const nextTab = value as AuditTab;
    setActiveTab(nextTab);
    setFilters(current => ({
      ...current,
      ...tabFilters[nextTab],
      snapshotAt: undefined,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      cursorSortValue: undefined,
      direction: undefined,
    }));
  }, []);

  const openDetail = useCallback((id: number) => {
    setSelectedLogId(id);
    setDetailOpen(true);
  }, []);

  const retry = useCallback(() => {
    logsQuery.refetch();
    summaryQuery.refetch();
  }, [logsQuery, summaryQuery]);

  const refreshSnapshot = useCallback(() => {
    setFilters(current => ({
      ...current,
      snapshotAt: undefined,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      cursorSortValue: undefined,
      direction: undefined,
    }));
  }, []);

  const headerAction = useMemo(
    () => ({
      onClick: refreshSnapshot,
      isLoading: logsQuery.isFetching || summaryQuery.isFetching,
    }),
    [logsQuery.isFetching, refreshSnapshot, summaryQuery.isFetching]
  );

  useSystemHeaderAction(headerAction);

  const goFirst = useCallback(() => {
    setFilters(current => ({
      ...current,
      snapshotAt,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      cursorSortValue: undefined,
      direction: undefined,
    }));
  }, [snapshotAt]);

  const goToCursor = useCallback(
    (cursor: AuditLogCursor | null | undefined, direction: 'next' | 'prev') => {
      if (!cursor) return;
      setFilters(current => ({
        ...current,
        snapshotAt,
        cursorCreatedAt: cursor.cursorCreatedAt,
        cursorId: cursor.cursorId,
        cursorSortValue: cursor.cursorSortValue,
        direction,
      }));
    },
    [snapshotAt]
  );

  const scrollToSection = useCallback((section: AuditSection) => {
    const container = pageShellRef.current;
    const target =
      section === 'logs' ? logsSectionRef.current : summarySectionRef.current;
    if (!container || !target) return;

    sectionScrollLockRef.current = true;
    if (sectionScrollTimeoutRef.current) {
      window.clearTimeout(sectionScrollTimeoutRef.current);
    }

    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top - containerTop;
    container.scrollTo({
      top: container.scrollTop + targetTop,
      behavior: 'smooth',
    });
    setActiveSection(section);

    sectionScrollTimeoutRef.current = window.setTimeout(() => {
      sectionScrollLockRef.current = false;
    }, 700);
  }, []);

  const handleSectionWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      const isScrollingDown = event.deltaY > 20;
      const isScrollingUp = event.deltaY < -20;
      if (
        (!isScrollingDown && !isScrollingUp) ||
        sectionScrollLockRef.current ||
        isInteractiveScrollTarget(event.target) ||
        hasOpenFloatingContent()
      ) {
        return;
      }

      const summaryScroller = (
        event.target as HTMLElement
      ).closest<HTMLElement>('[data-audit-summary-scroll]');

      if (summaryScroller && activeSection === 'summary') {
        if (
          (isScrollingUp && canScrollElement(summaryScroller, 'up')) ||
          (isScrollingDown && canScrollElement(summaryScroller, 'down')) ||
          isScrollingUp
        ) {
          return;
        }
      }

      if (activeSection === 'summary' && isScrollingDown) {
        event.preventDefault();
        scrollToSection('logs');
        return;
      }

      if (activeSection === 'logs' && isScrollingUp) {
        event.preventDefault();
        scrollToSection('summary');
      }
    },
    [activeSection, scrollToSection]
  );

  const handlePageScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const logsSection = logsSectionRef.current;
    if (!logsSection) return;

    const container = event.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    const logsTop = logsSection.getBoundingClientRect().top - containerTop;
    const nextSection =
      logsTop <= container.clientHeight * 0.35 ? 'logs' : 'summary';

    setActiveSection(current =>
      current === nextSection ? current : nextSection
    );
  }, []);

  useEffect(() => {
    if (!filters.snapshotAt && responseSnapshotAt) {
      setFilters(current =>
        current.snapshotAt
          ? current
          : {
              ...current,
              snapshotAt: responseSnapshotAt,
            }
      );
    }
  }, [filters.snapshotAt, responseSnapshotAt]);

  useEffect(
    () => () => {
      if (sectionScrollTimeoutRef.current) {
        window.clearTimeout(sectionScrollTimeoutRef.current);
      }
    },
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppPageShell
        ref={pageShellRef}
        className="min-h-0 flex-1 overflow-hidden overscroll-none scroll-smooth"
        onScroll={handlePageScroll}
        onWheel={handleSectionWheel}
      >
        <main className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-4 p-4 pr-14">
          <section
            ref={summarySectionRef}
            className="flex h-[calc(100dvh-5rem)] min-h-0 scroll-mt-4 flex-col"
          >
            <div
              data-audit-summary-scroll
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
            >
              <AuditLogStatsCards
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isFetching={summaryQuery.isFetching && !summaryQuery.isLoading}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={activeTab} onValueChange={changeTab}>
                  <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="critical">Criticos</TabsTrigger>
                    <TabsTrigger value="errors">Errores</TabsTrigger>
                    <TabsTrigger value="security">Seguridad</TabsTrigger>
                  </TabsList>
                </Tabs>

                {isPresetUpdating && (
                  <div
                    className="flex w-fit items-center gap-2 rounded-md border border-border bg-background/90 px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm"
                    aria-live="polite"
                  >
                    <Loader2 className="size-4 animate-spin" />
                    Actualizando vista...
                  </div>
                )}
              </div>

              <AuditLogInsights
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isFetching={summaryQuery.isFetching && !summaryQuery.isLoading}
                onView={openDetail}
              />
            </div>
          </section>

          <section
            ref={logsSectionRef}
            className="flex h-[calc(100dvh-5rem)] min-h-0 scroll-mt-4"
          >
            <AuditLogsTable
              className="h-full w-full"
              logs={logs}
              meta={logsQuery.data?.meta}
              filters={filters}
              modules={modules}
              isLoading={logsQuery.isLoading}
              isFetching={logsQuery.isFetching}
              isError={logsQuery.isError}
              onRetry={retry}
              onView={openDetail}
              timeUnit={timeUnit}
              onTimeUnitChange={setTimeUnit}
              onFiltersChange={updateFilters}
              onFirstPage={goFirst}
              onNextPage={() =>
                goToCursor(logsQuery.data?.meta.nextCursor, 'next')
              }
              onPreviousPage={() =>
                goToCursor(logsQuery.data?.meta.prevCursor, 'prev')
              }
            />
          </section>
        </main>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="fixed right-4 top-1/2 z-40 size-12 -translate-y-1/2 rounded-full border-border bg-background/95 text-secondary shadow-xl backdrop-blur transition-transform hover:scale-105 hover:bg-muted sm:right-6"
          aria-label={
            activeSection === 'logs' ? 'Ir al resumen' : 'Ir a logs registrados'
          }
          title={
            activeSection === 'logs' ? 'Ir al resumen' : 'Ir a logs registrados'
          }
          onClick={() =>
            scrollToSection(activeSection === 'logs' ? 'summary' : 'logs')
          }
        >
          {activeSection === 'logs' ? (
            <ArrowUp className="size-5" />
          ) : (
            <ArrowDown className="size-5" />
          )}
        </Button>
      </AppPageShell>

      <AuditLogDetailSheet
        logId={selectedLogId}
        open={detailOpen}
        timeUnit={timeUnit}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default AuditLogsPage;
