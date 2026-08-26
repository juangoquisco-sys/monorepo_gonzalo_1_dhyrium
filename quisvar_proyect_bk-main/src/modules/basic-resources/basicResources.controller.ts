import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import type { ControllerFunction } from '@/types/patterns';
import type { UserType } from '@/middlewares/auth.middleware';
import BasicResourcesService from './basicResources.service';
import {
  basicResourceCreateRequestSchema,
  basicResourceIdRequestSchema,
  basicResourceListRequestSchema,
  basicResourceUpdateRequestSchema,
} from './basicResources.schema';
import {
  basicResourceStorageKeyFromPath,
  resolveExistingBasicResourcePath,
} from './basicResources.storage';

const removeUploadedFiles = async (files: Express.Multer.File[]) => {
  await Promise.all(
    files.map(file =>
      existsSync(file.path) ? unlink(file.path) : Promise.resolve()
    )
  );
};

export const listBasicResources: ControllerFunction = async (req, res) => {
  const input = basicResourceListRequestSchema.parse({
    params: req.params,
    query: req.query,
  });
  const result = await BasicResourcesService.list(
    res.locals.userInfo as UserType,
    {
      ...input.params,
      ...input.query,
    }
  );
  res.status(200).json(result);
};

export const basicResourcesSummary: ControllerFunction = async (req, res) => {
  const input = basicResourceListRequestSchema.parse({
    params: req.params,
    query: {},
  });
  const result = await BasicResourcesService.summary(
    res.locals.userInfo as UserType,
    input.params
  );
  res.status(200).json(result);
};

export const createBasicResources: ControllerFunction = async (req, res) => {
  const input = basicResourceCreateRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const files = (req.files || []) as Express.Multer.File[];
  try {
    const resources = await BasicResourcesService.create(
      res.locals.userInfo as UserType,
      {
        ...input.params,
        ...input.body,
        files: files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          storageKey: basicResourceStorageKeyFromPath(file.path),
        })),
      }
    );
    res.status(201).json({ resources });
  } catch (error) {
    await removeUploadedFiles(files);
    throw error;
  }
};

export const updateBasicResource: ControllerFunction = async (req, res) => {
  const input = basicResourceUpdateRequestSchema.parse({
    params: req.params,
    body: req.body,
  });
  const resource = await BasicResourcesService.update(
    res.locals.userInfo as UserType,
    {
      ...input.params,
      ...input.body,
    }
  );
  res.status(200).json(resource);
};

export const deleteBasicResource: ControllerFunction = async (req, res) => {
  const input = basicResourceIdRequestSchema.parse({ params: req.params });
  const deleted = await BasicResourcesService.delete(
    res.locals.userInfo as UserType,
    input.params.unitId,
    input.params.resourceId
  );
  const filePath = resolveExistingBasicResourcePath(deleted.storageKey);
  if (existsSync(filePath)) await unlink(filePath);
  res.status(200).json({ id: input.params.resourceId });
};

export const downloadBasicResource: ControllerFunction = async (req, res) => {
  const input = basicResourceIdRequestSchema.parse({ params: req.params });
  const resource = await BasicResourcesService.download(
    res.locals.userInfo as UserType,
    input.params.unitId,
    input.params.resourceId
  );
  const filePath = resolveExistingBasicResourcePath(resource.storageKey);
  if (!existsSync(filePath)) {
    res.status(404).json({ message: 'El archivo ya no está disponible' });
    return;
  }
  res.type(resource.mimeType).download(filePath, resource.originalName);
};
