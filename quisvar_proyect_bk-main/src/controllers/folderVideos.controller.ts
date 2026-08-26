import { ControllerFunction } from '@/types/patterns';
import FolderVideosService from '@/services/folderVideos.services';

class FolderVideosControllers {
  public create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await FolderVideosService.create(body);
    res.status(201).json(query);
  };
  public getAll: ControllerFunction = async (req, res, next) => {
    try {
      const query = await FolderVideosService.getAll();
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public edit: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const query = await FolderVideosService.edit(+id, body);
    res.status(200).json(query);
  };
  public delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await FolderVideosService.delete(+id);
    res.status(200).json(query);
  };
}
export default new FolderVideosControllers();
