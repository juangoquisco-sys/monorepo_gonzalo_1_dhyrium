export type MeetingUnitHealth = 'HEALTHY' | 'WATCH' | 'CRITICAL';

export interface MeetingUnitOverviewItem {
  id: string;
  name: string;
  type: string;
  codemap?: string | null;
  directoryKey?: string | null;
  parentId?: string | null;
  isActive: boolean;
  metrics: {
    activeProjects: number;
    openCommitments: number;
    overdueCommitments: number;
    health: MeetingUnitHealth;
    nextMeeting?: {
      id: string;
      title: string;
      scheduledAt: string;
      status: string;
      unitId: string;
    } | null;
  };
}

export interface MeetingUnitsOverview {
  totals: {
    units: number;
    activeProjects: number;
    openCommitments: number;
    overdueCommitments: number;
    upcomingMeetings: number;
  };
  data: MeetingUnitOverviewItem[];
}

export type StageVersionSourceKind =
  | 'SAME_STAGE'
  | 'SAME_PROJECT_STAGE'
  | 'OTHER_PROJECT_STAGE'
  | 'EMPTY';

export type StageVersionType = 'BASICOS' | 'ESPECIALIDADES' | 'COSTOS' | 'OTRO';

export interface StageVersionInfo {
  id: string;
  groupId: string;
  stageId: number;
  versionNumber: number;
  versionLabel?: string | null;
  sourceKind: StageVersionSourceKind;
  sourceProjectId?: number | null;
  sourceStageId?: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';
  isCurrent: boolean;
  notes?: string | null;
  group?: {
    id: string;
    baseName: string;
    stageType?: StageVersionType | null;
    projectId: number;
  };
  sourceProject?: {
    id: number;
    name?: string | null;
    contract?: {
      cui?: string | null;
      projectName?: string | null;
      projectShortName?: string | null;
    } | null;
  } | null;
  sourceStage?: {
    id: number;
    name: string;
    projectId: number;
  } | null;
}

export interface MeetingStageOption {
  id: number;
  name: string;
  status: boolean;
  groupId?: number | null;
  versionMetadata?: StageVersionInfo | null;
  availability?: 'available' | 'occupiedByCurrentUnit' | 'occupiedByOtherUnit';
  occupiedByUnit?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface MeetingProjectFocus {
  id: string | null;
  unitId: string;
  unit?: {
    id: string;
    name: string;
    type: string;
    codemap?: string | null;
    parentId?: string | null;
  };
  projectId: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  isCurrent: boolean;
  notes?: string | null;
  stageFocus?: {
    id: string;
    unitId: string;
    projectId: number;
    stageId: number;
    status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
    isCurrent: boolean;
    notes?: string | null;
    unit?: {
      id: string;
      name: string;
      type: string;
      codemap?: string | null;
      parentId?: string | null;
    };
    stage: MeetingStageOption;
  }[];
  project: {
    id: number;
    name?: string | null;
    contract: {
      id: number;
      cui: string;
      projectName: string;
      projectShortName?: string | null;
      municipality?: string | null;
      milestones?: {
        id: string;
        title: string;
        dueDate?: string | null;
        status: string;
      }[];
    };
    stages: MeetingStageOption[];
  };
}
