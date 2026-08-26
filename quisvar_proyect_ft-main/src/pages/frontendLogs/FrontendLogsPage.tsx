import { ArrowDown, ArrowUp } from 'lucide-react';
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
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { useSystemHeaderAction } from '../system/SystemHeaderActionContext';
import { FrontendLogEventDetailSheet } from './components/FrontendLogEventDetailSheet';
import { FrontendLogEventsTable } from './components/FrontendLogEventsTable';
import { FrontendLogInsights } from './components/FrontendLogInsights';
import { FrontendLogStatsCards } from './components/FrontendLogStatsCards';
import type { FrontendLogCursor, FrontendLogFilters } from './models';
import { useFrontendLogEvents, useFrontendLogSummary } from './useFrontendLogs';

type FrontendLogSection = 'summary' | 'events';

const INITIAL_FILTERS: FrontendLogFilters = {
  limit: 25,
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

const FrontendLogsPage = () => {
  const [filters, setFilters] = useState<FrontendLogFilters>(INITIAL_FILTERS);
  const [activeSection, setActiveSection] =
    useState<FrontendLogSection>('summary');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const pageShellRef = useRef<HTMLElement | null>(null);
  const summarySectionRef = useRef<HTMLElement | null>(null);
  const eventsSectionRef = useRef<HTMLElement | null>(null);
  const sectionScrollLockRef = useRef(false);
  const sectionScrollTimeoutRef = useRef<number | null>(null);

  const eventsQuery = useFrontendLogEvents(filters);
  const responseSnapshotAt = eventsQuery.data?.meta.snapshotAt;
  const snapshotAt = filters.snapshotAt || responseSnapshotAt;
  const summaryFilters = useMemo(
    () => ({
      ...filters,
      snapshotAt,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      direction: undefined,
      limit: 25,
    }),
    [filters, snapshotAt]
  );
  const summaryQuery = useFrontendLogSummary(summaryFilters);
  const events = eventsQuery.data?.data || [];

  const updateFilters = useCallback((nextFilters: FrontendLogFilters) => {
    setFilters({
      ...nextFilters,
      snapshotAt: undefined,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      direction: undefined,
    });
  }, []);

  const openEventDetail = useCallback((id: number) => {
    setSelectedEventId(id);
    setDetailOpen(true);
  }, []);

  const retry = useCallback(() => {
    eventsQuery.refetch();
    summaryQuery.refetch();
  }, [eventsQuery, summaryQuery]);

  const refresh = useCallback(() => {
    setFilters(current => ({
      ...current,
      snapshotAt: undefined,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      direction: undefined,
    }));
  }, []);

  const goFirst = useCallback(() => {
    setFilters(current => ({
      ...current,
      snapshotAt,
      cursorCreatedAt: undefined,
      cursorId: undefined,
      direction: undefined,
    }));
  }, [snapshotAt]);

  const goToCursor = useCallback(
    (
      cursor: FrontendLogCursor | null | undefined,
      direction: 'next' | 'prev'
    ) => {
      if (!cursor) return;
      setFilters(current => ({
        ...current,
        snapshotAt,
        cursorCreatedAt: cursor.cursorCreatedAt,
        cursorId: cursor.cursorId,
        direction,
      }));
    },
    [snapshotAt]
  );

  const scrollToSection = useCallback((section: FrontendLogSection) => {
    const container = pageShellRef.current;
    const target =
      section === 'events'
        ? eventsSectionRef.current
        : summarySectionRef.current;
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
      ).closest<HTMLElement>('[data-frontend-summary-scroll]');

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
        scrollToSection('events');
        return;
      }

      if (activeSection === 'events' && isScrollingUp) {
        event.preventDefault();
        scrollToSection('summary');
      }
    },
    [activeSection, scrollToSection]
  );

  const handlePageScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const eventsSection = eventsSectionRef.current;
    if (!eventsSection) return;

    const container = event.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    const eventsTop = eventsSection.getBoundingClientRect().top - containerTop;
    const nextSection =
      eventsTop <= container.clientHeight * 0.35 ? 'events' : 'summary';

    setActiveSection(current =>
      current === nextSection ? current : nextSection
    );
  }, []);

  const headerAction = useMemo(
    () => ({
      onClick: refresh,
      isLoading: eventsQuery.isFetching || summaryQuery.isFetching,
    }),
    [eventsQuery.isFetching, refresh, summaryQuery.isFetching]
  );

  useSystemHeaderAction(headerAction);

  useEffect(() => {
    if (!filters.snapshotAt && responseSnapshotAt) {
      setFilters(current =>
        current.snapshotAt
          ? current
          : { ...current, snapshotAt: responseSnapshotAt }
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
              data-frontend-summary-scroll
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
            >
              <FrontendLogStatsCards
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isFetching={summaryQuery.isFetching && !summaryQuery.isLoading}
              />

              <FrontendLogInsights
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isFetching={summaryQuery.isFetching && !summaryQuery.isLoading}
                onViewEvent={openEventDetail}
              />
            </div>
          </section>

          <section
            ref={eventsSectionRef}
            className="flex h-[calc(100dvh-5rem)] min-h-0 scroll-mt-4"
          >
            <FrontendLogEventsTable
              className="h-full w-full"
              events={events}
              meta={eventsQuery.data?.meta}
              filters={filters}
              isLoading={eventsQuery.isLoading}
              isFetching={eventsQuery.isFetching}
              isError={eventsQuery.isError}
              onRetry={retry}
              onView={openEventDetail}
              onFiltersChange={updateFilters}
              onFirstPage={goFirst}
              onNextPage={() =>
                goToCursor(eventsQuery.data?.meta.nextCursor, 'next')
              }
              onPreviousPage={() =>
                goToCursor(eventsQuery.data?.meta.prevCursor, 'prev')
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
            activeSection === 'events'
              ? 'Ir al resumen'
              : 'Ir a eventos frontend'
          }
          title={
            activeSection === 'events'
              ? 'Ir al resumen'
              : 'Ir a eventos frontend'
          }
          onClick={() =>
            scrollToSection(activeSection === 'events' ? 'summary' : 'events')
          }
        >
          {activeSection === 'events' ? (
            <ArrowUp className="size-5" />
          ) : (
            <ArrowDown className="size-5" />
          )}
        </Button>
      </AppPageShell>

      <FrontendLogEventDetailSheet
        eventId={selectedEventId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default FrontendLogsPage;
