import { axiosInstance } from '@/services/axiosInstance';
import type { SubTask } from '@/types/types';
import type {
  MeetingCreatePayload,
  MeetingScope,
  MeetingViewConfiguration,
  MeetingWorkspaceView,
  MeetingHistoryItem,
  MeetingExternalContact,
  MeetingAgendaItemPayload,
  CalendarActivity,
  CalendarActivityPayload,
  CalendarItem,
  Commitment,
  CommitmentConfirmationStatus,
  CommitmentBoardResponse,
  CommitmentReviewDecision,
  CommitmentTargetType,
  MeetingParticipantPayload,
  MeetingUnitDashboard,
  OfficeMemberCandidate,
  OfficeMemberRole,
  OfficeProjectCandidate,
  OfficeProjectFocusPayload,
  OfficeProjectModeratorsResponse,
  ProgressReport,
  ProgressReportPayload,
  ProgressReportsWorkspace,
  ReportIndexTemplate,
  ReportIndexTemplatePayload,
  ReportIndexTemplateScope,
  ReportItemTemplate,
  TechnicalCommitmentAssignmentPayload,
  TechnicalCommitmentCreateResponse,
  TechnicalCommitmentPreview,
  TechnicalReviewResponse,
  TechnicalReviewSubmission,
  TechnicalStageTree,
  BasicResourcesResponse,
  BasicResource,
  CreateStageVersionPayload,
  CreateStageVersionResponse,
  StageVersionSource,
} from '../types/officeMeetings.types';
import type {
  MeetingProjectFocus,
  StageVersionType,
} from '../types/meetingUnitProjects.types';

export const getCommitmentBoard = async () => {
  const res = await axiosInstance.get<CommitmentBoardResponse>(
    '/meeting-units/commitment-board'
  );
  return res.data;
};

export const getMeetingUnitDashboard = async (unitId: string) => {
  const res = await axiosInstance.get<MeetingUnitDashboard>(
    `/meeting-units/${unitId}/dashboard`
  );
  return res.data;
};

export const getMeetingUnitTechnicalProjects = async (
  unitId: string,
  options?: { scope?: 'self' | 'descendants'; includeInactive?: boolean }
) => {
  const res = await axiosInstance.get<MeetingProjectFocus[]>(
    `/meeting-units/${unitId}/technical-projects`,
    {
      params: {
        scope: options?.scope,
        includeInactive: options?.includeInactive,
      },
    }
  );
  return res.data;
};

export const getMeetingUnitTechnicalStageTree = async ({
  unitId,
  projectId,
  stageId,
  status,
}: {
  unitId: string;
  projectId: number;
  stageId: number;
  status?: string;
}) => {
  const res = await axiosInstance.get<TechnicalStageTree>(
    `/meeting-units/${unitId}/projects/${projectId}/stages/${stageId}/tree`,
    { params: { status } }
  );
  return res.data;
};

const basicResourcePath = (
  unitId: string,
  projectId: number,
  stageId: number
) => `/basic-resources/${unitId}/projects/${projectId}/stages/${stageId}`;

export const getBasicResources = async (input: {
  unitId: string;
  projectId: number;
  stageId: number;
  q?: string;
}) => {
  const res = await axiosInstance.get<BasicResourcesResponse>(
    basicResourcePath(input.unitId, input.projectId, input.stageId),
    { params: { q: input.q } }
  );
  return res.data;
};

export const createBasicResources = async (input: {
  unitId: string;
  projectId: number;
  stageId: number;
  files: File[];
  targets: {
    levelId?: number;
    subTaskId?: number;
    includeDescendants?: boolean;
  }[];
  title?: string;
  description?: string;
}) => {
  const formData = new FormData();
  input.files.forEach(file => formData.append('files', file));
  formData.append('targets', JSON.stringify(input.targets));
  if (input.title) formData.append('title', input.title);
  if (input.description) formData.append('description', input.description);
  const res = await axiosInstance.post<{ resources: BasicResource[] }>(
    basicResourcePath(input.unitId, input.projectId, input.stageId),
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const deleteBasicResource = async (
  unitId: string,
  resourceId: string
) => {
  await axiosInstance.delete(`/basic-resources/${unitId}/${resourceId}`);
};

export const downloadBasicResource = async (
  unitId: string,
  resourceId: string
) => {
  const res = await axiosInstance.get(
    `/basic-resources/${unitId}/${resourceId}/download`,
    {
      responseType: 'blob',
    }
  );
  return res.data as Blob;
};

export const getStageVersionSources = async (
  unitId: string,
  projectId: number,
  options?: { search?: string; type?: StageVersionType | 'ALL' }
) => {
  const res = await axiosInstance.get<StageVersionSource[]>(
    `/meeting-units/${unitId}/projects/${projectId}/stage-version-sources`,
    {
      params: {
        search: options?.search,
        type: options?.type === 'ALL' ? undefined : options?.type,
      },
    }
  );
  return res.data;
};

export const createStageVersion = async (
  unitId: string,
  projectId: number,
  baseStageId: number,
  payload: CreateStageVersionPayload
) => {
  const res = await axiosInstance.post<CreateStageVersionResponse>(
    `/meeting-units/${unitId}/projects/${projectId}/stages/${baseStageId}/versions`,
    payload
  );
  return res.data;
};

export const markStageVersionCurrent = async (
  unitId: string,
  projectId: number,
  stageId: number
) => {
  const res = await axiosInstance.patch<{
    stage: CreateStageVersionResponse['stage'];
  }>(
    `/meeting-units/${unitId}/projects/${projectId}/stages/${stageId}/version-current`
  );
  return res.data;
};

export const updateWorkspaceStage = async (
  stageId: number,
  payload: { name?: string }
) => {
  const res = await axiosInstance.patch(`/stages/${stageId}`, payload);
  return res.data;
};

export const deleteWorkspaceStage = async (stageId: number) => {
  const res = await axiosInstance.delete(`/stages/${stageId}`);
  return res.data;
};

export const duplicateWorkspaceStage = async (
  stageId: number,
  payload: { name: string }
) => {
  const res = await axiosInstance.post(`/duplicates/stage/${stageId}`, payload);
  return res.data;
};

export const previewTechnicalCommitmentAssignment = async (
  unitId: string,
  payload: TechnicalCommitmentAssignmentPayload
) => {
  const res = await axiosInstance.post<TechnicalCommitmentPreview>(
    `/meeting-units/${unitId}/technical-commitments/preview-assignment`,
    payload
  );
  return res.data;
};

export const createTechnicalCommitment = async (
  unitId: string,
  payload: TechnicalCommitmentAssignmentPayload
) => {
  const res = await axiosInstance.post<TechnicalCommitmentCreateResponse>(
    `/meeting-units/${unitId}/technical-commitments`,
    payload
  );
  return res.data;
};

type TechnicalExecutionPayload = {
  projectId: number;
  stageId: number;
  percentage: number;
  files?: File[];
  fileType?: 'UPLOADS' | 'MODEL';
};

const buildTechnicalExecutionFormData = (
  payload: TechnicalExecutionPayload
) => {
  const formData = new FormData();
  formData.append('projectId', String(payload.projectId));
  formData.append('stageId', String(payload.stageId));
  formData.append('percentage', String(payload.percentage));
  if (payload.fileType) formData.append('fileType', payload.fileType);
  (payload.files || []).forEach(file => formData.append('files', file));
  return formData;
};

export const saveTechnicalExecutionProgress = async (
  unitId: string,
  taskId: number,
  payload: TechnicalExecutionPayload
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/progress`,
    buildTechnicalExecutionFormData(payload),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const sendTechnicalExecutionReview = async (
  unitId: string,
  taskId: number,
  payload: TechnicalExecutionPayload
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/send-review`,
    buildTechnicalExecutionFormData(payload),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const getTechnicalReviewSubmissions = async (
  unitId: string,
  taskId: number
) => {
  const res = await axiosInstance.get<TechnicalReviewSubmission[]>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/review-submissions`,
    { headers: { noLoader: true } }
  );
  return res.data;
};

export const createTechnicalReviewSubmission = async (
  unitId: string,
  taskId: number,
  payload: Pick<
    TechnicalExecutionPayload,
    'projectId' | 'stageId' | 'percentage' | 'files'
  >
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/review-submissions`,
    buildTechnicalExecutionFormData({ ...payload, fileType: 'UPLOADS' }),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const appendTechnicalReviewFiles = async (
  unitId: string,
  taskId: number,
  payload: Pick<TechnicalExecutionPayload, 'projectId' | 'stageId' | 'files'>
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/review-files`,
    buildTechnicalExecutionFormData({
      ...payload,
      percentage: 0,
      fileType: 'UPLOADS',
    }),
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const updateTechnicalReviewPercentage = async (
  unitId: string,
  taskId: number,
  payload: {
    projectId: number;
    stageId: number;
    percentage: number;
  }
) => {
  const res = await axiosInstance.patch<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/review-percentage`,
    payload
  );
  return res.data;
};

export const reassignTechnicalExecutionTask = async (
  unitId: string,
  taskId: number,
  payload: {
    projectId: number;
    stageId: number;
    newOwnerId: number;
    reason?: string | null;
    withdrawPendingReview?: boolean;
  }
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/reassign`,
    payload
  );
  return res.data;
};

export const selfAssignTechnicalExecutionTask = async (
  unitId: string,
  taskId: number,
  payload: { projectId: number; stageId: number }
) => {
  const res = await axiosInstance.post<SubTask>(
    `/meeting-units/${unitId}/technical-execution/tasks/${taskId}/self-assign`,
    payload
  );
  return res.data;
};

export const getTechnicalTaskDetail = async (taskId: number) => {
  const res = await axiosInstance.get<SubTask>(`/subtasks/${taskId}`, {
    headers: { noLoader: true },
  });
  return res.data;
};

export const deleteTechnicalTaskFile = async (fileId: number) => {
  const res = await axiosInstance.delete(`/files/remove/${fileId}`);
  return res.data;
};

type TechnicalReviewPayload = {
  projectId: number;
  stageId: number;
  decision: CommitmentReviewDecision;
  comment?: string | null;
  commitmentId?: string | null;
  contextId?: string | null;
  applyToChildren?: boolean;
};

export const reviewTechnicalTask = async (
  unitId: string,
  taskId: number,
  payload: TechnicalReviewPayload
) => {
  const res = await axiosInstance.post<TechnicalReviewResponse>(
    `/meeting-units/${unitId}/technical-reviews/tasks/${taskId}`,
    payload
  );
  return res.data;
};

export const reviewTechnicalLevel = async (
  unitId: string,
  levelId: number,
  payload: TechnicalReviewPayload
) => {
  const res = await axiosInstance.post<TechnicalReviewResponse>(
    `/meeting-units/${unitId}/technical-reviews/levels/${levelId}`,
    payload
  );
  return res.data;
};

type TechnicalValuationPayload = {
  projectId: number;
  stageId: number;
  monthlyPrice: number;
  tasks: { id: number; days: number }[];
};

export const updateTechnicalValuation = async (
  unitId: string,
  payload: TechnicalValuationPayload
) => {
  const res = await axiosInstance.patch<TechnicalStageTree>(
    `/meeting-units/${unitId}/technical-valuations/tasks`,
    payload
  );
  return res.data;
};

export const createTechnicalLevel = async ({
  stageId,
  rootId,
  name,
  typeItem = 'NUM',
  withTask = false,
}: {
  stageId: number;
  rootId: number;
  name: string;
  typeItem?: 'ABC' | 'ROM' | 'NUM';
  withTask?: boolean;
}) => {
  const res = await axiosInstance.post(
    '/levels',
    { stagesId: stageId, rootId, name, typeItem },
    { params: { withTask } }
  );
  return res.data;
};

export const createTechnicalSiblingLevel = async ({
  levelId,
  name,
  position,
}: {
  levelId: number;
  name: string;
  position: 'upper' | 'lower';
}) => {
  const res = await axiosInstance.post(
    `/levels/${levelId}`,
    { name },
    { params: { type: position } }
  );
  return res.data;
};

export const updateTechnicalLevel = async ({
  levelId,
  name,
}: {
  levelId: number;
  name: string;
}) => {
  const res = await axiosInstance.put(`/levels/${levelId}`, { name });
  return res.data;
};

export const deleteTechnicalLevel = async (levelId: number) => {
  const res = await axiosInstance.delete(`/levels/${levelId}`);
  return res.data;
};

export const createTechnicalSubtask = async ({
  levelId,
  name,
}: {
  levelId: number;
  name: string;
}) => {
  const res = await axiosInstance.post('/subtasks', {
    levels_Id: levelId,
    name,
    price: 0,
    days: 0,
  });
  return res.data;
};

export const createTechnicalSiblingSubtask = async ({
  subtaskId,
  name,
  position,
}: {
  subtaskId: number;
  name: string;
  position: 'upper' | 'lower';
}) => {
  const res = await axiosInstance.post(
    `/subtasks/${subtaskId}`,
    { name, days: 0 },
    { params: { type: position } }
  );
  return res.data;
};

export const updateTechnicalSubtask = async ({
  subtaskId,
  name,
}: {
  subtaskId: number;
  name: string;
}) => {
  const res = await axiosInstance.put(`/subtasks/${subtaskId}`, { name });
  return res.data;
};

export const deleteTechnicalSubtask = async (subtaskId: number) => {
  const res = await axiosInstance.delete(`/subtasks/${subtaskId}`);
  return res.data;
};

export const duplicateTechnicalLevel = async ({
  levelId,
  name,
}: {
  levelId: number;
  name: string;
}) => {
  const res = await axiosInstance.post(`/duplicates/level/${levelId}`, {
    name,
  });
  return res.data;
};

export const duplicateTechnicalSubtask = async ({
  subtaskId,
  name,
}: {
  subtaskId: number;
  name: string;
}) => {
  const res = await axiosInstance.post(`/duplicates/subtask/${subtaskId}`, {
    name,
  });
  return res.data;
};

export const getMeetingUnitProjectFocus = async (unitId: string) => {
  const res = await axiosInstance.get<MeetingProjectFocus[]>(
    `/meeting-units/${unitId}/project-focus`
  );
  return res.data;
};

export const getOfficeProjectCandidates = async (
  search?: string,
  unitId?: string
) => {
  const res = await axiosInstance.get<OfficeProjectCandidate[]>(
    '/meeting-units/project-candidates',
    { params: { search, unitId } }
  );
  return res.data;
};

export const linkMeetingUnitProjectFocus = async (
  unitId: string,
  payload: OfficeProjectFocusPayload
) => {
  const res = await axiosInstance.post<MeetingProjectFocus | null>(
    `/meeting-units/${unitId}/project-focus`,
    payload
  );
  return res.data;
};

export const updateMeetingUnitProjectFocus = async (
  unitId: string,
  focusId: string,
  payload: OfficeProjectFocusPayload
) => {
  const res = await axiosInstance.patch<MeetingProjectFocus | null>(
    `/meeting-units/${unitId}/project-focus/${focusId}`,
    payload
  );
  return res.data;
};

export const getOfficeProjectModerators = async (unitId: string) => {
  const res = await axiosInstance.get<OfficeProjectModeratorsResponse>(
    `/meeting-units/${unitId}/project-moderators`
  );
  return res.data;
};

export const updateOfficeProjectModerator = async (
  unitId: string,
  membershipId: string,
  canManageUnitProjects: boolean
) => {
  const res = await axiosInstance.patch(
    `/meeting-units/${unitId}/project-moderators/${membershipId}`,
    { canManageUnitProjects }
  );
  return res.data;
};

export const getOfficeMemberCandidates = async (
  unitId: string,
  search?: string
) => {
  const res = await axiosInstance.get<OfficeMemberCandidate[]>(
    `/meeting-units/${unitId}/member-candidates`,
    { params: { search } }
  );
  return res.data;
};

export const addOfficeMember = async (
  unitId: string,
  payload: {
    userId: number;
    role?: OfficeMemberRole;
    isPrimary?: boolean;
    isUnitLead?: boolean;
    canManageUnitProjects?: boolean;
  }
) => {
  const res = await axiosInstance.post(
    `/meeting-units/${unitId}/members`,
    payload
  );
  return res.data;
};

export const bulkAddOfficeMembers = async (
  unitId: string,
  payload: {
    members: {
      userId: number;
      role?: OfficeMemberRole;
      isPrimary?: boolean;
      isUnitLead?: boolean;
      canManageUnitProjects?: boolean;
    }[];
  }
) => {
  const res = await axiosInstance.post(
    `/meeting-units/${unitId}/members/bulk`,
    payload
  );
  return res.data as {
    created: unknown[];
    skipped: { userId: number; reason: string }[];
    unitLeadMembershipId?: string | null;
  };
};

export const updateOfficeMember = async (
  unitId: string,
  membershipId: string,
  payload: {
    role?: OfficeMemberRole;
    roleId?: number | null;
    isPrimary?: boolean;
    isUnitLead?: boolean;
    canManageUnitProjects?: boolean;
  }
) => {
  const res = await axiosInstance.patch(
    `/meeting-units/${unitId}/members/${membershipId}`,
    payload
  );
  return res.data;
};

export const removeOfficeMember = async (
  unitId: string,
  membershipId: string
) => {
  const res = await axiosInstance.delete(
    `/meeting-units/${unitId}/members/${membershipId}`
  );
  return res.data;
};

export const unlinkMeetingUnitProjectFocus = async (
  unitId: string,
  focusId: string
) => {
  const res = await axiosInstance.delete(
    `/meeting-units/${unitId}/project-focus/${focusId}`
  );
  return res.data;
};

export const createMeeting = async (payload: MeetingCreatePayload) => {
  const res = await axiosInstance.post('/meetings', payload);
  return res.data;
};

export const startMeeting = async (meetingId: string) => {
  const res = await axiosInstance.post(`/meetings/${meetingId}/start`);
  return res.data;
};

export const endMeeting = async (meetingId: string) => {
  const res = await axiosInstance.post(`/meetings/${meetingId}/end`);
  return res.data;
};

export const getMeetingViewConfig = async (unitId: string) => {
  const res = await axiosInstance.get<MeetingViewConfiguration>(
    `/meeting-units/${unitId}/meeting-view-config`
  );
  return res.data;
};

export const updateMeetingViewConfig = async (
  unitId: string,
  payload: {
    defaultScope: MeetingScope;
    defaultView: MeetingWorkspaceView;
    visibleViews: MeetingWorkspaceView[];
  }
) => {
  const res = await axiosInstance.put<MeetingViewConfiguration>(
    `/meeting-units/${unitId}/meeting-view-config`,
    payload
  );
  return res.data;
};

export const deleteMeetingViewConfig = async (unitId: string) => {
  const res = await axiosInstance.delete<MeetingViewConfiguration>(
    `/meeting-units/${unitId}/meeting-view-config`
  );
  return res.data;
};

export const resumeMeeting = async (meetingId: string, reason?: string) => {
  const res = await axiosInstance.post(`/meetings/${meetingId}/resume`, {
    reason,
  });
  return res.data;
};

export const updateMeetingScope = async (
  meetingId: string,
  scope: MeetingScope
) => {
  const res = await axiosInstance.patch(`/meetings/${meetingId}/scope`, {
    scope,
  });
  return res.data;
};

export const getMeetings = async (params: {
  unitId: string;
  status?: string;
}) => {
  const res = await axiosInstance.get<MeetingHistoryItem[]>('/meetings', {
    params,
  });
  return res.data;
};

export const getMeeting = async (meetingId: string) => {
  const res = await axiosInstance.get(`/meetings/${meetingId}`);
  return res.data;
};

export const updateMeetingAttendance = async (
  meetingId: string,
  participants: MeetingParticipantPayload[]
) => {
  const res = await axiosInstance.put(`/meetings/${meetingId}/attendance`, {
    participants,
  });
  return res.data;
};

export const addMeetingParticipants = async (
  meetingId: string,
  participants: MeetingParticipantPayload[]
) => {
  const res = await axiosInstance.post(`/meetings/${meetingId}/participants`, {
    participants,
  });
  return res.data;
};

export const removeMeetingParticipant = async (
  meetingId: string,
  participantId: string
) => {
  const res = await axiosInstance.delete(
    `/meetings/${meetingId}/participants/${participantId}`
  );
  return res.data;
};

export const getMeetingParticipantCandidates = async (
  meetingId: string,
  search?: string
) => {
  const res = await axiosInstance.get<OfficeMemberCandidate[]>(
    `/meetings/${meetingId}/participant-candidates`,
    { params: { search } }
  );
  return res.data;
};

export const getMeetingExternalContacts = async (search?: string) => {
  const res = await axiosInstance.get<MeetingExternalContact[]>(
    '/meeting-external-contacts',
    { params: { search } }
  );
  return res.data;
};

export const createMeetingExternalContact = async (
  payload: Partial<MeetingExternalContact>
) => {
  const res = await axiosInstance.post<MeetingExternalContact>(
    '/meeting-external-contacts',
    payload
  );
  return res.data;
};

export const updateMeetingMinutes = async (
  meetingId: string,
  content: string
) => {
  const res = await axiosInstance.put(`/meetings/${meetingId}/minutes`, {
    content,
  });
  return res.data;
};

export const updateMeetingProjectMinutes = async (
  meetingId: string,
  projectId: number,
  content: string
) => {
  const res = await axiosInstance.put(
    `/meetings/${meetingId}/projects/${projectId}/minutes`,
    { content }
  );
  return res.data;
};

export const addMeetingAgendaItem = async (
  meetingId: string,
  payload: MeetingAgendaItemPayload
) => {
  const res = await axiosInstance.post(
    `/meetings/${meetingId}/agenda-items`,
    payload
  );
  return res.data;
};

export const updateMeetingAgendaItem = async (
  meetingId: string,
  itemId: string,
  payload: Partial<MeetingAgendaItemPayload>
) => {
  const res = await axiosInstance.patch(
    `/meetings/${meetingId}/agenda-items/${itemId}`,
    payload
  );
  return res.data;
};

export const createProgressReport = async (payload: ProgressReportPayload) => {
  const res = await axiosInstance.post<ProgressReport>(
    '/progress-reports',
    payload
  );
  return res.data;
};

export const getProgressReportsWorkspace = async () => {
  const res = await axiosInstance.get<ProgressReportsWorkspace>(
    '/progress-reports/workspace'
  );
  return res.data;
};

export const getProgressReport = async (reportId: string) => {
  const res = await axiosInstance.get<ProgressReport>(
    `/progress-reports/${reportId}`
  );
  return res.data;
};

export const updateProgressReport = async (
  reportId: string,
  payload: Partial<ProgressReportPayload>
) => {
  const res = await axiosInstance.patch<ProgressReport>(
    `/progress-reports/${reportId}`,
    payload
  );
  return res.data;
};

export const markProgressReportReady = async (reportId: string) => {
  const res = await axiosInstance.post<ProgressReport>(
    `/progress-reports/${reportId}/ready`
  );
  return res.data;
};

export const deleteProgressReportDraft = async (reportId: string) => {
  const res = await axiosInstance.delete<{ id: string }>(
    `/progress-reports/${reportId}`
  );
  return res.data;
};

export const getReportItemTemplates = async (source?: string) => {
  const res = await axiosInstance.get<ReportItemTemplate[]>(
    '/report-item-templates',
    { params: { source } }
  );
  return res.data;
};

export const getReportIndexTemplates = async (params?: {
  unitId?: string;
  scope?: ReportIndexTemplateScope;
}) => {
  const res = await axiosInstance.get<ReportIndexTemplate[]>(
    '/report-index-templates',
    { params }
  );
  return res.data;
};

export const createReportIndexTemplate = async (
  payload: ReportIndexTemplatePayload
) => {
  const res = await axiosInstance.post<ReportIndexTemplate>(
    '/report-index-templates',
    payload
  );
  return res.data;
};

export const updateReportIndexTemplate = async (
  templateId: string,
  payload: Partial<ReportIndexTemplatePayload>
) => {
  const res = await axiosInstance.patch<ReportIndexTemplate>(
    `/report-index-templates/${templateId}`,
    payload
  );
  return res.data;
};

export const deleteReportIndexTemplate = async (templateId: string) => {
  const res = await axiosInstance.delete<{ id: string }>(
    `/report-index-templates/${templateId}`
  );
  return res.data;
};

export const saveProgressReportAsTemplate = async (
  reportId: string,
  payload: Pick<
    ReportIndexTemplatePayload,
    'name' | 'scope' | 'unitId' | 'description'
  >
) => {
  const res = await axiosInstance.post<ReportIndexTemplate>(
    `/progress-reports/${reportId}/save-as-template`,
    payload
  );
  return res.data;
};

export const createCommitment = async (payload: {
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: Commitment['priority'];
  contexts?: {
    targetType: CommitmentTargetType;
    unitId?: string | null;
    projectId?: number | null;
    stageId?: number | null;
    levelId?: number | null;
    subTaskId?: number | null;
    includeChildren?: boolean;
    isPrimary?: boolean;
  }[];
  assignees?: {
    userId?: number;
    unitId?: string;
    role?: 'OWNER' | 'SUPPORT';
  }[];
}) => {
  const res = await axiosInstance.post('/commitments', payload);
  return res.data;
};

export const updateCommitment = async (
  commitmentId: string,
  payload: Partial<{
    unitId: string;
    projectId: number | null;
    meetingId: string | null;
    title: string;
    description: string | null;
    dueDate: string | null;
    status: Commitment['status'];
    priority: Commitment['priority'];
    contexts: {
      targetType: CommitmentTargetType;
      unitId?: string | null;
      projectId?: number | null;
      stageId?: number | null;
      levelId?: number | null;
      subTaskId?: number | null;
      includeChildren?: boolean;
      isPrimary?: boolean;
    }[];
    assignees: {
      userId?: number;
      unitId?: string;
      role?: 'OWNER' | 'SUPPORT';
    }[];
  }>
) => {
  const res = await axiosInstance.patch<Commitment>(
    `/commitments/${commitmentId}`,
    payload
  );
  return res.data;
};

export const updateCommitmentStatus = async (
  commitmentId: string,
  status: Commitment['status']
) => {
  const res = await axiosInstance.patch<Commitment>(
    `/commitments/${commitmentId}/status`,
    { status }
  );
  return res.data;
};

export const reviewCommitment = async (
  commitmentId: string,
  payload: {
    decision: CommitmentReviewDecision;
    comment?: string | null;
    contextId?: string | null;
    meetingId?: string | null;
  }
) => {
  const res = await axiosInstance.post<Commitment>(
    `/commitments/${commitmentId}/reviews`,
    payload
  );
  return res.data;
};

export const updateCommitmentReviewComment = async (
  commitmentId: string,
  payload: {
    comment?: string | null;
    contextId?: string | null;
  }
) => {
  const res = await axiosInstance.patch<Commitment>(
    `/commitments/${commitmentId}/reviews/comment`,
    payload
  );
  return res.data;
};

export const deleteCommitment = async (commitmentId: string) => {
  const res = await axiosInstance.delete<{ id: string }>(
    `/commitments/${commitmentId}`
  );
  return res.data;
};

export const getCommitments = async (params?: {
  unitId?: string;
  projectId?: number;
  meetingId?: string;
  confirmationStatus?: CommitmentConfirmationStatus;
  targetType?: CommitmentTargetType;
  stageId?: number;
  levelId?: number;
  subTaskId?: number;
  includeChildren?: boolean;
  reviewDecision?: CommitmentReviewDecision;
  assigneeUserId?: number;
  assigneeUnitId?: string;
}) => {
  const res = await axiosInstance.get<Commitment[]>('/commitments', { params });
  return res.data;
};

export const createCommitmentProposal = async (payload: {
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignees?: {
    userId?: number;
    unitId?: string;
    role?: 'OWNER' | 'SUPPORT';
  }[];
}) => {
  const res = await axiosInstance.post<Commitment>(
    '/commitments/proposals',
    payload
  );
  return res.data;
};

export const confirmCommitment = async (
  commitmentId: string,
  confirmationStatus: CommitmentConfirmationStatus = 'CONFIRMED'
) => {
  const res = await axiosInstance.post<Commitment>(
    `/commitments/${commitmentId}/confirm`,
    { confirmationStatus }
  );
  return res.data;
};

export const attachCommitmentToMeeting = async (
  commitmentId: string,
  meetingId: string | null
) => {
  const res = await axiosInstance.post<Commitment>(
    `/commitments/${commitmentId}/attach-meeting`,
    { meetingId }
  );
  return res.data;
};

export const getCalendarItems = async (params?: {
  scope?: 'person' | 'unit' | 'project';
  unitId?: string;
  projectId?: number;
  from?: string;
  to?: string;
}) => {
  const res = await axiosInstance.get<CalendarItem[]>('/calendar', { params });
  return res.data;
};

export const createCalendarActivity = async (
  payload: CalendarActivityPayload
) => {
  const res = await axiosInstance.post<CalendarActivity>(
    '/calendar-activities',
    payload
  );
  return res.data;
};

export const updateCalendarActivity = async (
  id: string,
  payload: Partial<CalendarActivityPayload>
) => {
  const res = await axiosInstance.patch<CalendarActivity>(
    `/calendar-activities/${id}`,
    payload
  );
  return res.data;
};

export const deleteCalendarActivity = async (id: string) => {
  const res = await axiosInstance.delete<{ id: string }>(
    `/calendar-activities/${id}`
  );
  return res.data;
};

