import { RequestHandler, Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import MeetingUnitsControllers from '@/controllers/meetingUnits.controllers';
import uploads from '@/middlewares/upload.middleware';

const router = Router();

const bindTaskIdForUpload: RequestHandler = (req, _res, next) => {
  req.params.id = req.params.taskId;
  next();
};

router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'));

router.get('/overview', MeetingUnitsControllers.overview);
router.get(
  '/:unitId/meeting-view-config',
  MeetingUnitsControllers.meetingViewConfig
);
router.put(
  '/:unitId/meeting-view-config',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.updateMeetingViewConfig
);
router.delete(
  '/:unitId/meeting-view-config',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.deleteMeetingViewConfig
);
router.get('/commitment-board', MeetingUnitsControllers.commitmentBoard);
router.get('/project-candidates', MeetingUnitsControllers.projectCandidates);
router.get('/:unitId/dashboard', MeetingUnitsControllers.dashboard);
router.get('/:unitId/projects', MeetingUnitsControllers.projects);
router.get(
  '/:unitId/technical-projects',
  MeetingUnitsControllers.technicalProjects
);
router.get(
  '/:unitId/projects/:projectId/stage-version-sources',
  MeetingUnitsControllers.stageVersionSources
);
router.post(
  '/:unitId/projects/:projectId/stages/:baseStageId/versions',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.createStageVersion
);
router.patch(
  '/:unitId/projects/:projectId/stages/:stageId/version-current',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.markStageVersionCurrent
);
router.get(
  '/:unitId/projects/:projectId/stages/:stageId/tree',
  MeetingUnitsControllers.technicalProjectStageTree
);
router.post(
  '/:unitId/technical-commitments/preview-assignment',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.previewTechnicalCommitmentAssignment
);
router.post(
  '/:unitId/technical-commitments',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.createTechnicalCommitment
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/progress',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  bindTaskIdForUpload,
  uploads.taskFiles('UPLOADS').array('files'),
  MeetingUnitsControllers.saveTechnicalExecutionProgress
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/send-review',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  bindTaskIdForUpload,
  uploads.taskFiles('REVIEW').array('files'),
  MeetingUnitsControllers.sendTechnicalExecutionReview
);
router.get(
  '/:unitId/technical-execution/tasks/:taskId/review-submissions',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  MeetingUnitsControllers.technicalReviewSubmissions
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/review-submissions',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  bindTaskIdForUpload,
  uploads.taskFiles('REVIEW').array('files'),
  MeetingUnitsControllers.createTechnicalReviewSubmission
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/review-files',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  bindTaskIdForUpload,
  uploads.taskFiles('REVIEW').array('files'),
  MeetingUnitsControllers.appendTechnicalReviewFiles
);
router.patch(
  '/:unitId/technical-execution/tasks/:taskId/review-percentage',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.updateTechnicalReviewPercentage
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/reassign',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.reassignTechnicalExecutionTask
);
router.post(
  '/:unitId/technical-execution/tasks/:taskId/self-assign',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.selfAssignTechnicalExecutionTask
);
router.post(
  '/:unitId/technical-reviews/tasks/:taskId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.reviewTechnicalTask
);
router.post(
  '/:unitId/technical-reviews/levels/:levelId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.reviewTechnicalLevel
);
router.patch(
  '/:unitId/technical-valuations/tasks',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.updateTechnicalValuation
);
router.get('/:unitId/project-focus', MeetingUnitsControllers.projectFocusAdmin);
router.get(
  '/:unitId/project-moderators',
  MeetingUnitsControllers.projectModerators
);
router.get(
  '/:unitId/member-candidates',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.memberCandidates
);

router.post(
  '/:unitId/project-focus',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.linkProjectFocus
);
router.patch(
  '/:unitId/project-focus/:focusId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.updateProjectFocus
);
router.delete(
  '/:unitId/project-focus/:focusId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.unlinkProjectFocus
);
router.patch(
  '/:unitId/project-moderators/:membershipId',
  role.RoleHandler(['MOD'], 'grupos'),
  MeetingUnitsControllers.updateProjectModerator
);
router.post(
  '/:unitId/members',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.addMember
);
router.post(
  '/:unitId/members/bulk',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.addMembersBulk
);
router.patch(
  '/:unitId/members/:membershipId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.updateMember
);
router.delete(
  '/:unitId/members/:membershipId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingUnitsControllers.terminateMember
);

export default router;
