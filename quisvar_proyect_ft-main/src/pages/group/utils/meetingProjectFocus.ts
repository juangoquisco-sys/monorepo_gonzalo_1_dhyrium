import type { MeetingProjectFocus } from '../types/meetingUnitProjects.types';

export const focusKey = (focus: MeetingProjectFocus) =>
  focus.id || `${focus.unitId}-${focus.projectId}`;

export const activeStageFocus = (focus?: MeetingProjectFocus | null) =>
  (focus?.stageFocus ?? []).filter(
    stageFocus => stageFocus.isCurrent && stageFocus.status !== 'INACTIVE'
  );

export const activeFocusStages = (focus?: MeetingProjectFocus | null) =>
  activeStageFocus(focus)
    .map(stageFocus => stageFocus.stage)
    .sort((a, b) => {
      const currentSort =
        Number(b.versionMetadata?.isCurrent || false) -
        Number(a.versionMetadata?.isCurrent || false);
      if (currentSort) return currentSort;
      const versionSort =
        (b.versionMetadata?.versionNumber || 0) -
        (a.versionMetadata?.versionNumber || 0);
      if (versionSort) return versionSort;
      return a.name.localeCompare(b.name);
    });

/**
 * The stage a unit is actually working on for this project focus right now.
 * Falls back to the project's first stage when no office-level stage focus
 * has been configured yet, matching the prior "first stage" navigation.
 */
export const getCurrentStageId = (
  focus?: MeetingProjectFocus | null
): number | undefined =>
  activeStageFocus(focus)[0]?.stageId ?? focus?.project.stages?.[0]?.id;
