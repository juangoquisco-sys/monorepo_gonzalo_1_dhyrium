import { useMemo, useState } from 'react';
import { CalendarRange, ChevronDown, Repeat2, Users } from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatDutyDisplayDate,
  getDutyUserFullName,
} from '../../../dutyRotations.utils';
import type {
  DutyDistributionWarning,
  DutyPreviewOccurrence,
  DutySlot,
} from '../../../models/dutyRotations.types';

interface DutyDistributedPreviewProps {
  occurrences: DutyPreviewOccurrence[];
  distributionWarnings: DutyDistributionWarning[];
  slots: DutySlot[];
}

interface DutyDistributionZone {
  key: string;
  label: string;
  instructions: string | null;
  assignments: DutyPreviewOccurrence[];
}

interface DutyDistributionJourney {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  participantCount: number;
  repeatedParticipantCount: number;
  zones: DutyDistributionZone[];
}

interface DutyDistributionJourneyBuilder {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  participantIds: Set<number>;
  zones: Map<string, DutyDistributionZone>;
}

const groupDistributionJourneys = (
  occurrences: DutyPreviewOccurrence[],
  distributionWarnings: DutyDistributionWarning[],
  slots: DutySlot[]
): DutyDistributionJourney[] => {
  const slotOrder = new Map(slots.map((slot, index) => [slot.key, index]));
  const warningByOccurrence = new Map(
    distributionWarnings.map(warning => [
      warning.occurrenceKey,
      warning.repeatedParticipantCount,
    ])
  );
  const journeys = new Map<string, DutyDistributionJourneyBuilder>();

  occurrences.forEach(occurrence => {
    let journey = journeys.get(occurrence.occurrenceKey);
    if (!journey) {
      journey = {
        occurrenceKey: occurrence.occurrenceKey,
        periodStart: occurrence.periodStart,
        periodEnd: occurrence.periodEnd,
        dueOn: occurrence.dueOn,
        participantIds: new Set<number>(),
        zones: new Map<string, DutyDistributionZone>(),
      };
      journeys.set(occurrence.occurrenceKey, journey);
    }

    journey.participantIds.add(occurrence.assignedUser.id);
    const zoneKey = occurrence.baseSlotKey ?? occurrence.slotKey;
    const zone = journey.zones.get(zoneKey);
    if (zone) {
      zone.assignments.push(occurrence);
      return;
    }
    journey.zones.set(zoneKey, {
      key: zoneKey,
      label: occurrence.slotLabel,
      instructions: occurrence.slotInstructions,
      assignments: [occurrence],
    });
  });

  return Array.from(journeys.values()).map(journey => ({
    occurrenceKey: journey.occurrenceKey,
    periodStart: journey.periodStart,
    periodEnd: journey.periodEnd,
    dueOn: journey.dueOn,
    participantCount: journey.participantIds.size,
    repeatedParticipantCount:
      warningByOccurrence.get(journey.occurrenceKey) ?? 0,
    zones: Array.from(journey.zones.values())
      .sort(
        (first, second) =>
          (slotOrder.get(first.key) ?? Number.MAX_SAFE_INTEGER) -
            (slotOrder.get(second.key) ?? Number.MAX_SAFE_INTEGER) ||
          first.label.localeCompare(second.label, 'es')
      )
      .map(zone => ({
        ...zone,
        assignments: [...zone.assignments].sort(
          (first, second) =>
            (first.slotPosition ?? Number.MAX_SAFE_INTEGER) -
              (second.slotPosition ?? Number.MAX_SAFE_INTEGER) ||
            getDutyUserFullName(first.assignedUser).localeCompare(
              getDutyUserFullName(second.assignedUser),
              'es'
            )
        ),
      })),
  }));
};

const formatJourneyPeriod = (journey: DutyDistributionJourney) =>
  journey.periodStart === journey.periodEnd
    ? formatDutyDisplayDate(journey.periodStart)
    : `${formatDutyDisplayDate(journey.periodStart)} – ${formatDutyDisplayDate(
        journey.periodEnd
      )}`;

const DutyDistributedPreview = ({
  occurrences,
  distributionWarnings,
  slots,
}: DutyDistributedPreviewProps) => {
  const journeys = useMemo(
    () => groupDistributionJourneys(occurrences, distributionWarnings, slots),
    [distributionWarnings, occurrences, slots]
  );
  const [expandedOccurrenceKeys, setExpandedOccurrenceKeys] = useState(
    () => new Set(journeys[0] ? [journeys[0].occurrenceKey] : [])
  );

  const toggleJourney = (occurrenceKey: string) => {
    setExpandedOccurrenceKeys(current => {
      const next = new Set(current);
      if (next.has(occurrenceKey)) next.delete(occurrenceKey);
      else next.add(occurrenceKey);
      return next;
    });
  };

  return (
    <div className="dutyRotations-distributionPreview">
      {journeys.length > 1 ? (
        <div
          className="dutyRotations-distributionPreviewActions"
          aria-label="Controles de las jornadas"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedOccurrenceKeys(
                new Set(journeys.map(journey => journey.occurrenceKey))
              )
            }
          >
            Expandir todas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpandedOccurrenceKeys(new Set())}
          >
            Contraer todas
          </Button>
        </div>
      ) : null}

      <div className="dutyRotations-distributionJourneys">
        {journeys.map(journey => {
          const isExpanded = expandedOccurrenceKeys.has(journey.occurrenceKey);
          const panelId = `duty-distribution-${journey.occurrenceKey}`;
          return (
            <article
              key={journey.occurrenceKey}
              className="dutyRotations-distributionJourney"
            >
              <button
                type="button"
                className="dutyRotations-distributionJourneyTrigger"
                aria-controls={isExpanded ? panelId : undefined}
                aria-expanded={isExpanded}
                onClick={() => toggleJourney(journey.occurrenceKey)}
              >
                <span className="dutyRotations-distributionJourneyIcon">
                  <CalendarRange aria-hidden="true" />
                </span>
                <span className="dutyRotations-distributionJourneyHeading">
                  <strong>{formatJourneyPeriod(journey)}</strong>
                  <small>Vence {formatDutyDisplayDate(journey.dueOn)}</small>
                </span>
                <span className="dutyRotations-distributionJourneyMeta">
                  <AppBadge variant="outline">
                    {journey.zones.length}{' '}
                    {journey.zones.length === 1 ? 'zona' : 'zonas'}
                  </AppBadge>
                  <AppBadge variant="outline">
                    <Users aria-hidden="true" />
                    {journey.participantCount}{' '}
                    {journey.participantCount === 1 ? 'persona' : 'personas'}
                  </AppBadge>
                  {journey.repeatedParticipantCount ? (
                    <AppBadge variant="warning">
                      <Repeat2 aria-hidden="true" />
                      {journey.repeatedParticipantCount}{' '}
                      {journey.repeatedParticipantCount === 1
                        ? 'repite zona'
                        : 'repiten zona'}
                    </AppBadge>
                  ) : null}
                </span>
                <ChevronDown
                  className={isExpanded ? 'is-expanded' : undefined}
                  aria-hidden="true"
                />
              </button>

              {isExpanded ? (
                <div
                  id={panelId}
                  className="dutyRotations-distributionJourneyContent"
                >
                  <Table
                    aria-label={`Distribución de ${formatJourneyPeriod(
                      journey
                    )}`}
                    containerClassName="dutyRotations-distributionTable"
                  >
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zona o grupo</TableHead>
                        <TableHead>Personas asignadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journey.zones.map(zone => (
                        <TableRow key={zone.key}>
                          <TableCell className="dutyRotations-distributionZone">
                            <strong>{zone.label}</strong>
                            {zone.instructions ? (
                              <p>{zone.instructions}</p>
                            ) : null}
                            <small>
                              {zone.assignments.length}{' '}
                              {zone.assignments.length === 1
                                ? 'persona'
                                : 'personas'}
                            </small>
                          </TableCell>
                          <TableCell>
                            <ol className="dutyRotations-distributionPeople">
                              {zone.assignments.map((assignment, index) => (
                                <li key={assignment.slotKey}>
                                  <span aria-hidden="true">{index + 1}</span>
                                  {getDutyUserFullName(assignment.assignedUser)}
                                </li>
                              ))}
                            </ol>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default DutyDistributedPreview;
