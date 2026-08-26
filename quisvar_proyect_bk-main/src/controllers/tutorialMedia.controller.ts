import type { ControllerFunction } from '@/types/patterns';
import TutorialMediaService from '@/services/tutorialMedia.services';
import AppError from '@/utils/appError';
import {
  isTutorialMaterialImage,
  sanitizeTutorialMaterialName,
} from '@/services/tutorialMaterials.policy';

const parseId = (value: string, label: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(`${label} no es válido.`, 400);
  }
  return id;
};

const ticketVideoId = (videoId: number, scopedVideoId: unknown) => {
  if (videoId !== scopedVideoId) {
    throw new AppError('El acceso no corresponde a este tutorial.', 403);
  }
};

const sendFile: ControllerFunction = async (req, res, next) => {
  const videoId = parseId(req.params.id, 'El tutorial');
  ticketVideoId(videoId, res.locals.tutorialMediaVideoId);
  const filePath = await TutorialMediaService.video(videoId);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath, error => {
    if (error) next(error);
  });
};

const sendThumbnail: ControllerFunction = async (req, res, next) => {
  const videoId = parseId(req.params.id, 'El tutorial');
  ticketVideoId(videoId, res.locals.tutorialMediaVideoId);
  const filePath = await TutorialMediaService.thumbnail(videoId);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath, error => {
    if (error) next(error);
  });
};

const sendMaterial: ControllerFunction = async (req, res, next) => {
  const materialId = parseId(req.params.id, 'El material');
  const videoId = Number(res.locals.tutorialMediaVideoId);
  const material = await TutorialMediaService.material(videoId, materialId);
  const safeName = sanitizeTutorialMaterialName(material.name);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (isTutorialMaterialImage(safeName)) {
    res.sendFile(material.filePath, error => {
      if (error) next(error);
    });
    return;
  }

  res.download(material.filePath, safeName, error => {
    if (error) next(error);
  });
};

export { sendFile, sendMaterial, sendThumbnail };
