import PathServices from '@/services/paths.services';
import ProjectsServices from '@/services/projects.services';
import { existsSync } from 'fs';
import AppError from '@/utils/appError';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { ProjectParams } from '@/types/project';
class ProjectsControllers {
  public static showAll: ControllerFunction = async (req, res) => {
    const request = parseQueries<ProjectParams>(req.query);
    const query = await ProjectsServices.getAll(request);
    res.status(200).json(query);
  };

  public static showOne: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const userSession = res.locals.userInfo;
    const project_id = parseInt(id);
    const query = await ProjectsServices.find(project_id, +userSession.id);
    res.status(200).json(query);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await ProjectsServices.create(body);
    ProjectsServices.createFolders(['MODEL', 'REVIEW', 'UPLOADS'], query.id);
    res.status(201).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const _project_id = parseInt(id);
    const oldDir = await PathServices.project(_project_id, 'UPLOADS');
    if (!existsSync(oldDir))
      throw new AppError('No se pudo editar el projecto', 400);
    const query = await ProjectsServices.update(_project_id, body);
    res.status(200).json(query);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id: projectId } = req.params;
    const { id } = await ProjectsServices.delete(+projectId);
    ProjectsServices.deleteFolders(['MODEL', 'REVIEW', 'UPLOADS'], id);
    res.status(204).send();
  };
}

export default ProjectsControllers;
