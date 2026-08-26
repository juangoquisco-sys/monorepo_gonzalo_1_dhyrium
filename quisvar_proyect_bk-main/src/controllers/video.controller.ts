import { ControllerFunction } from '@/types/patterns';
import VideoService from '@/services/video.services';
import AppError from '@/utils/appError';
import { FilesProps } from '@/types/types';
import { sanitizeTutorialMaterialName } from '@/services/tutorialMaterials.policy';
import { createTutorialMediaTicket } from '@/services/tutorialMediaTicket.service';
interface DocData {
  name: string;
  path: string;
}
class VideoControllers {
  public create: ControllerFunction = async (req, res, next) => {
    try {
      const { body } = req;
      const { url, miniature, docs } = req.files as FilesProps;
      if (!url) throw new AppError('Oops!, no se pudo subir el video', 400);
      const docsData: DocData[] = docs
        ? docs.map(file => ({
            name: sanitizeTutorialMaterialName(file.originalname),
            path: file.filename,
          }))
        : [];
      const query = await VideoService.create(
        {
          ...body,
          url: url[0].filename,
          miniature: miniature ? miniature[0].filename : '',
          folderId: +body.folderId,
        },
        docsData
      );
      res.locals.tutorialUploadsCommitted = true;
      res.status(201).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public getByFolderId: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await VideoService.getByFolderId(+id);
    const userId = res.locals.userInfo.id;
    res.status(200).json(
      query.map(video => ({
        ...video,
        mediaTicket: createTutorialMediaTicket(userId, video.id),
      }))
    );
  };
  public getVideo: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await VideoService.getVideo(+id);
    res.status(200).json(
      query
        ? {
            ...query,
            mediaTicket: createTutorialMediaTicket(
              res.locals.userInfo.id,
              query.id
            ),
          }
        : null
    );
  };
  public edit: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const query = await VideoService.edit(body, +id);
    res.status(200).json(query);
  };
  public delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await VideoService.delete(+id);
    res.status(200).json(query);
  };
  /* ---------------------------------- Docs ---------------------------------- */
  public addDocs: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { docs } = req.files as FilesProps;
    if (!docs || docs.length === 0)
      throw new AppError('No se enviaron materiales adjuntos', 400);
    const docsData: DocData[] = docs.map(file => ({
      name: sanitizeTutorialMaterialName(file.originalname),
      path: file.filename,
    }));
    const query = await VideoService.addDocs(docsData, +id);
    res.locals.tutorialUploadsCommitted = true;
    res.status(200).json(query);
  };
  public deleteDoc: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await VideoService.deleteDoc(+id);
    res.status(200).json(query);
  };
  /* --------------------------------- Videos --------------------------------- */
  public addVideo: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { url, miniature } = req.files as FilesProps;
    if (!url) throw new AppError('Oops!, no se pudo subir el video', 400);
    if (!miniature) throw new AppError('No se pudo generar la miniatura', 400);
    const query = await VideoService.addVideo(
      {
        url: url[0].filename,
        miniature: miniature[0].filename,
      },
      +id
    );
    res.locals.tutorialUploadsCommitted = true;
    res.status(200).json(query);
  };
  public deleteOnlyVideo: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await VideoService.deleteOnlyVideo(+id);
    res.status(200).json(query);
  };
}
export default new VideoControllers();
