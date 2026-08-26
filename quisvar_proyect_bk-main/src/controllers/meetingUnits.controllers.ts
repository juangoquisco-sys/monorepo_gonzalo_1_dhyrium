import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import MeetingUnitsServices from '@/services/meetingUnits.services';
import MeetingViewConfigurationServices from '@/services/meetingViewConfiguration.services';
import AppError from '@/utils/appError';
import { z } from 'zod';

const technicalReviewSubmissionSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  stageId: z.coerce.number().int().positive(),
  percentage: z.coerce.number().int().min(1).max(100),
});

class MeetingUnitsControllers {
  public static meetingViewConfig: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      res
        .status(200)
        .json(
          await MeetingViewConfigurationServices.get(
            res.locals.userInfo as UserType,
            req.params.unitId
          )
        );
    } catch (error) {
      next(error);
    }
  };

  public static updateMeetingViewConfig: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      res
        .status(200)
        .json(
          await MeetingViewConfigurationServices.upsert(
            res.locals.userInfo as UserType,
            req.params.unitId,
            req.body
          )
        );
    } catch (error) {
      next(error);
    }
  };

  public static deleteMeetingViewConfig: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      res
        .status(200)
        .json(
          await MeetingViewConfigurationServices.remove(
            res.locals.userInfo as UserType,
            req.params.unitId
          )
        );
    } catch (error) {
      next(error);
    }
  };

  public static overview: ControllerFunction = async (req, res, next) => {
    try {
      const query = await MeetingUnitsServices.overview(
        res.locals.userInfo as UserType
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static commitmentBoard: ControllerFunction = async (req, res) => {
    const query = await MeetingUnitsServices.commitmentBoard(
      res.locals.userInfo as UserType
    );
    res.status(200).json(query);
  };

  public static dashboard: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.dashboard(
      res.locals.userInfo as UserType,
      unitId
    );
    res.status(200).json(query);
  };

  public static projects: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.projects(
      res.locals.userInfo as UserType,
      unitId
    );
    res.status(200).json(query);
  };

  public static technicalProjects: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const { scope, includeInactive } = req.query;
    const query = await MeetingUnitsServices.technicalProjects(
      res.locals.userInfo as UserType,
      unitId,
      typeof scope === 'string' ? scope : undefined,
      includeInactive === 'true'
    );
    res.status(200).json(query);
  };

  public static technicalProjectStageTree: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, projectId, stageId } = req.params;
    const { status } = req.query;
    const query = await MeetingUnitsServices.technicalProjectStageTree(
      res.locals.userInfo as UserType,
      unitId,
      Number(projectId),
      Number(stageId),
      typeof status === 'string' ? (status as any) : undefined
    );
    res.status(200).json(query);
  };

  public static stageVersionSources: ControllerFunction = async (req, res) => {
    const { unitId, projectId } = req.params;
    const { search, type } = req.query;
    const query = await MeetingUnitsServices.stageVersionSources(
      res.locals.userInfo as UserType,
      unitId,
      Number(projectId),
      {
        search: typeof search === 'string' ? search : undefined,
        type: typeof type === 'string' ? (type as any) : undefined,
      }
    );
    res.status(200).json(query);
  };

  public static createStageVersion: ControllerFunction = async (req, res) => {
    const { unitId, projectId, baseStageId } = req.params;
    const query = await MeetingUnitsServices.createStageVersion(
      res.locals.userInfo as UserType,
      unitId,
      Number(projectId),
      Number(baseStageId),
      req.body
    );
    res.status(201).json(query);
  };

  public static markStageVersionCurrent: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, projectId, stageId } = req.params;
    const query = await MeetingUnitsServices.markStageVersionCurrent(
      res.locals.userInfo as UserType,
      unitId,
      Number(projectId),
      Number(stageId)
    );
    res.status(200).json(query);
  };

  public static previewTechnicalCommitmentAssignment: ControllerFunction =
    async (req, res) => {
      const { unitId } = req.params;
      const query =
        await MeetingUnitsServices.previewTechnicalCommitmentAssignment(
          res.locals.userInfo as UserType,
          unitId,
          req.body
        );
      res.status(200).json(query);
    };

  public static createTechnicalCommitment: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.createTechnicalCommitment(
      res.locals.userInfo as UserType,
      unitId,
      req.body
    );
    res.status(201).json(query);
  };

  public static saveTechnicalExecutionProgress: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.saveTechnicalExecutionProgress(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      {
        ...req.body,
        files: (req.files as Express.Multer.File[]) || [],
      }
    );
    res.status(200).json(query);
  };

  public static sendTechnicalExecutionReview: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.sendTechnicalExecutionReview(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      {
        ...req.body,
        files: (req.files as Express.Multer.File[]) || [],
      }
    );
    res.status(200).json(query);
  };

  public static technicalReviewSubmissions: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.technicalReviewSubmissions(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId)
    );
    res.status(200).json(query);
  };

  public static createTechnicalReviewSubmission: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const payload = technicalReviewSubmissionSchema.safeParse(req.body);
    if (!payload.success)
      throw new AppError(
        'Proyecto, etapa y avance entero entre 1 y 100 son obligatorios',
        400
      );
    const query = await MeetingUnitsServices.createTechnicalReviewSubmission(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      {
        ...payload.data,
        files: (req.files as Express.Multer.File[]) || [],
      }
    );
    res.status(201).json(query);
  };

  public static appendTechnicalReviewFiles: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.appendTechnicalReviewFiles(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      {
        ...req.body,
        files: (req.files as Express.Multer.File[]) || [],
      }
    );
    res.status(200).json(query);
  };

  public static updateTechnicalReviewPercentage: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.updateTechnicalReviewPercentage(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      req.body
    );
    res.status(200).json(query);
  };

  public static reassignTechnicalExecutionTask: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, taskId } = req.params;
    const query = await MeetingUnitsServices.reassignTechnicalExecutionTask(
      res.locals.userInfo as UserType,
      unitId,
      Number(taskId),
      req.body
    );
    res.status(200).json(query);
  };

  public static selfAssignTechnicalExecutionTask: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      const { unitId, taskId } = req.params;
      const query = await MeetingUnitsServices.selfAssignTechnicalExecutionTask(
        res.locals.userInfo as UserType,
        unitId,
        Number(taskId),
        req.body
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static reviewTechnicalTask: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      const { unitId, taskId } = req.params;
      const query = await MeetingUnitsServices.reviewTechnicalTask(
        res.locals.userInfo as UserType,
        unitId,
        Number(taskId),
        req.body
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static reviewTechnicalLevel: ControllerFunction = async (req, res) => {
    const { unitId, levelId } = req.params;
    const query = await MeetingUnitsServices.reviewTechnicalLevel(
      res.locals.userInfo as UserType,
      unitId,
      Number(levelId),
      req.body
    );
    res.status(200).json(query);
  };

  public static updateTechnicalValuation: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.updateTechnicalValuation(
      res.locals.userInfo as UserType,
      unitId,
      req.body
    );
    res.status(200).json(query);
  };

  public static projectFocusAdmin: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.projectFocusAdmin(
      res.locals.userInfo as UserType,
      unitId
    );
    res.status(200).json(query);
  };

  public static projectCandidates: ControllerFunction = async (req, res) => {
    const { search, unitId } = req.query;
    const query = await MeetingUnitsServices.projectCandidates(
      typeof search === 'string' ? search : undefined,
      typeof unitId === 'string' ? unitId : undefined
    );
    res.status(200).json(query);
  };

  public static linkProjectFocus: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.linkProjectFocus(
      res.locals.userInfo as UserType,
      unitId,
      req.body
    );
    res.status(200).json(query);
  };

  public static updateProjectFocus: ControllerFunction = async (req, res) => {
    const { unitId, focusId } = req.params;
    const query = await MeetingUnitsServices.updateProjectFocus(
      res.locals.userInfo as UserType,
      unitId,
      focusId,
      req.body
    );
    res.status(200).json(query);
  };

  public static unlinkProjectFocus: ControllerFunction = async (req, res) => {
    const { unitId, focusId } = req.params;
    const query = await MeetingUnitsServices.unlinkProjectFocus(
      res.locals.userInfo as UserType,
      unitId,
      focusId
    );
    res.status(200).json(query);
  };

  public static projectModerators: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.projectModerators(
      res.locals.userInfo as UserType,
      unitId
    );
    res.status(200).json(query);
  };

  public static updateProjectModerator: ControllerFunction = async (
    req,
    res
  ) => {
    const { unitId, membershipId } = req.params;
    const query = await MeetingUnitsServices.updateProjectModerator(
      res.locals.userInfo as UserType,
      unitId,
      membershipId,
      Boolean(req.body?.canManageUnitProjects)
    );
    res.status(200).json(query);
  };

  public static memberCandidates: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const { search } = req.query;
    const query = await MeetingUnitsServices.memberCandidates(
      res.locals.userInfo as UserType,
      unitId,
      typeof search === 'string' ? search : undefined
    );
    res.status(200).json(query);
  };

  public static addMember: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.addMember(
      res.locals.userInfo as UserType,
      unitId,
      req.body
    );
    res.status(201).json(query);
  };

  public static addMembersBulk: ControllerFunction = async (req, res) => {
    const { unitId } = req.params;
    const query = await MeetingUnitsServices.addMembersBulk(
      res.locals.userInfo as UserType,
      unitId,
      req.body
    );
    res.status(201).json(query);
  };

  public static updateMember: ControllerFunction = async (req, res) => {
    const { unitId, membershipId } = req.params;
    const query = await MeetingUnitsServices.updateMember(
      res.locals.userInfo as UserType,
      unitId,
      membershipId,
      req.body
    );
    res.status(200).json(query);
  };

  public static terminateMember: ControllerFunction = async (req, res) => {
    const { unitId, membershipId } = req.params;
    const query = await MeetingUnitsServices.terminateMember(
      res.locals.userInfo as UserType,
      unitId,
      membershipId
    );
    res.status(200).json(query);
  };
}

export default MeetingUnitsControllers;
