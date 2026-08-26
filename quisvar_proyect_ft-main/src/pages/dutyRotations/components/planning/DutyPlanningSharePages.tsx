import { forwardRef } from 'react';
import {
  getShareableDutyUserName,
  type DutyPlanningOccurrence,
} from '../../dutyPlanningGroups';
import { formatDutyDisplayDate } from '../../dutyRotations.utils';
import type { ValidDutyRotation } from '../../models/dutyRotations.types';

interface DutyPlanningSharePagesProps {
  duty: ValidDutyRotation;
  pages: DutyPlanningOccurrence[][];
  distributed: boolean;
  generatedAt: string;
}

const DutyPlanningSharePages = forwardRef<
  HTMLDivElement,
  DutyPlanningSharePagesProps
>(({ distributed, duty, generatedAt, pages }, ref) => (
  <div className="dutyRotations-shareCaptureRoot" ref={ref} aria-hidden="true">
    {pages.map((page, pageIndex) => (
      <section
        key={`${page[0]?.occurrenceKey}-${pageIndex}`}
        className="dutyRotations-sharePage"
        data-duty-share-page
      >
        <header>
          <span>PLANIFICACIÓN DE ROTACIONES</span>
          <h2>{duty.name}</h2>
          <p>
            {distributed
              ? 'Distribución del equipo por zona de trabajo'
              : 'Próximas responsabilidades programadas'}
          </p>
        </header>
        <div className="dutyRotations-sharePageJourneys">
          {page.map(occurrence => (
            <article key={occurrence.occurrenceKey}>
              <div className="dutyRotations-sharePagePeriod">
                <span>JORNADA</span>
                <strong>
                  {formatDutyDisplayDate(occurrence.periodStart)}
                  {occurrence.periodStart !== occurrence.periodEnd
                    ? ` – ${formatDutyDisplayDate(occurrence.periodEnd)}`
                    : ''}
                </strong>
                <small>Vence {formatDutyDisplayDate(occurrence.dueOn)}</small>
              </div>
              <div className="dutyRotations-sharePageZones">
                {occurrence.zones.map(zone => (
                  <section key={zone.key}>
                    <div>
                      <strong>{zone.label}</strong>
                      {zone.instructions ? <p>{zone.instructions}</p> : null}
                    </div>
                    <ol>
                      {zone.assignments.map(assignment => (
                        <li key={assignment.id}>
                          {assignment.status === 'OPEN_POOL'
                            ? 'Por cubrir'
                            : getShareableDutyUserName(assignment.assignedUser)}
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
        <footer>
          <span>Generado desde Dhyrium · {generatedAt}</span>
          <span>
            Página {pageIndex + 1} de {pages.length}
          </span>
        </footer>
      </section>
    ))}
  </div>
));

export default DutyPlanningSharePages;
