import type { NextFunction, Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import {
  getTaskDocumentAssetRequestSchema,
  getTaskDocumentRequestSchema,
  listTaskDocumentVersionsRequestSchema,
  restoreTaskDocumentVersionRequestSchema,
  saveTaskDocumentRequestSchema,
} from './taskDocuments.schema';
import TaskDocumentsService from './taskDocuments.service';
import TaskDocumentPreviewService from './taskDocumentPreview.service';
import {
  createTaskDocumentOfficeSessionSchema,
  ensureTaskDocumentOriginalVersionSchema,
  listTaskDocumentFileVersionsSchema,
  restoreTaskDocumentFileVersionSchema,
  taskDocumentOfficeFileSchema,
  taskDocumentOfficeSessionSchema,
} from './taskDocumentOffice.schema';
import TaskDocumentOfficeService from './taskDocumentOffice.service';
import { DOCX_MIME_TYPE } from './taskDocumentOffice.domain';
import TaskDocumentOfficePolicy from './taskDocumentOffice.policy';

const getUser = (res: Response) => res.locals.userInfo as UserType;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const supportedLockXml =
  '<D:supportedlock><D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry></D:supportedlock>';

const activeLockXml = (input: {
  lockActive: boolean;
  lockExpiresAt: Date | null;
  lockToken: string;
}) => {
  if (!input.lockActive || !input.lockExpiresAt) {
    return '<D:lockdiscovery/>';
  }
  const seconds = Math.max(
    1,
    Math.floor((input.lockExpiresAt.getTime() - Date.now()) / 1000)
  );
  return `<D:lockdiscovery><D:activelock><D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth><D:timeout>Second-${seconds}</D:timeout><D:locktoken><D:href>${escapeXml(
    input.lockToken
  )}</D:href></D:locktoken></D:activelock></D:lockdiscovery>`;
};

class TaskDocumentsController {
  static async validateCanEditTaskDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const input = getTaskDocumentRequestSchema.parse({ params: req.params });
    await TaskDocumentOfficePolicy.assertCanEdit(
      getUser(res),
      input.params.taskKind,
      input.params.taskId
    );
    next();
  }

  static capabilities(_req: Request, res: Response) {
    res.status(200).json(TaskDocumentOfficeService.capabilities());
  }

  static async createOfficeSession(req: Request, res: Response) {
    const input = createTaskDocumentOfficeSessionSchema.parse({
      params: req.params,
      body: req.body,
    });
    const session = await TaskDocumentOfficeService.createSession({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      sourceFileId: input.body.sourceFileId,
      provider: input.body.provider,
      user: res.locals.userInfo as UserType,
    });
    res.status(201).json({ session });
  }

  static async validateOfficeFileSession(
    req: Request,
    _res: Response,
    next: NextFunction
  ) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    await TaskDocumentOfficeService.assertPublicSessionActive(
      input.params.token
    );
    next();
  }

  static async officeSession(req: Request, res: Response) {
    const input = taskDocumentOfficeSessionSchema.parse({ params: req.params });
    const session = await TaskDocumentOfficeService.getSession(
      input.params.sessionId,
      res.locals.userInfo as UserType
    );
    res.status(200).json({ session });
  }

  static async releaseOfficeSession(req: Request, res: Response) {
    const input = taskDocumentOfficeSessionSchema.parse({ params: req.params });
    await TaskDocumentOfficeService.releaseSession(
      input.params.sessionId,
      res.locals.userInfo as UserType
    );
    res.status(204).send();
  }

  static async ensureOriginalFileVersion(req: Request, res: Response) {
    const input = ensureTaskDocumentOriginalVersionSchema.parse({
      params: req.params,
      body: req.body,
    });
    const version = await TaskDocumentOfficeService.ensureOriginalVersion({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      sourceFileId: input.body.sourceFileId,
      user: res.locals.userInfo as UserType,
    });
    res.status(200).json({ version });
  }

  static async fileVersions(req: Request, res: Response) {
    const input = listTaskDocumentFileVersionsSchema.parse({
      params: req.params,
      query: req.query,
    });
    const versions = await TaskDocumentOfficeService.listVersions(
      input.params.taskKind,
      input.params.taskId,
      input.query.sourceFileId,
      input.query.limit,
      res.locals.userInfo as UserType
    );
    res.status(200).json({ versions });
  }

  static async fileVersionContent(req: Request, res: Response) {
    const input = restoreTaskDocumentFileVersionSchema.parse({
      params: req.params,
      query: req.query,
    });
    const file = await TaskDocumentOfficeService.downloadVersion({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      versionNumber: input.params.versionNumber,
      sourceFileId: input.query.sourceFileId,
      user: res.locals.userInfo as UserType,
    });
    const quotedName = file.version.originalName.replace(/["\\\r\n]/g, '_');
    res.set({
      'Content-Type': DOCX_MIME_TYPE,
      'Content-Disposition': `attachment; filename="v${file.version.versionNumber}-${quotedName}"`,
      'Content-Length': String(file.buffer.length),
      ETag: `"${file.version.checksumSha256}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    res.status(200).send(file.buffer);
  }

  static async restoreFileVersion(req: Request, res: Response) {
    const input = restoreTaskDocumentFileVersionSchema.parse({
      params: req.params,
      query: req.query,
    });
    const version = await TaskDocumentOfficeService.restoreVersion({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      versionNumber: input.params.versionNumber,
      sourceFileId: input.query.sourceFileId,
      user: res.locals.userInfo as UserType,
    });
    res.status(201).json({ version });
  }

  static async officeCollectionOptions(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const resource = await TaskDocumentOfficeService.getPublicResource(
      input.params.token,
      'OPTIONS_COLLECTION'
    );
    res.locals.auditUserId = resource.session.actorId;
    res.set({
      DAV: '1',
      'MS-Author-Via': 'DAV',
      Allow: 'OPTIONS, PROPFIND',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Dhyrium-Session-Phase': resource.lifecycle.phase,
      'X-Dhyrium-Session-Expires': resource.lifecycle.expiresAt.toISOString(),
    });
    res.status(200).send();
  }

  static async officeCollectionProperties(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const depth = String(req.headers.depth ?? '0').trim();
    if (depth !== '0' && depth !== '1') {
      throw new AppError(
        'La colecciÃ³n WebDAV solo admite PROPFIND Depth 0 o 1.',
        400,
        'TASK_DOCUMENT_DAV_DEPTH_NOT_SUPPORTED'
      );
    }
    const resource = await TaskDocumentOfficeService.getPublicResource(
      input.params.token,
      'PROPFIND_COLLECTION'
    );
    res.locals.auditUserId = resource.session.actorId;
    const collectionHref = escapeXml(
      `${req.originalUrl.split('?')[0].replace(/\/+$/, '')}/`
    );
    const fileHref = escapeXml(
      `${req.originalUrl
        .split('?')[0]
        .replace(/\/+$/, '')}/${encodeURIComponent(
        resource.version.originalName
      )}`
    );
    const collectionResponse = `<D:response><D:href>${collectionHref}</D:href><D:propstat><D:prop><D:displayname>Dhyrium Word</D:displayname><D:resourcetype><D:collection/></D:resourcetype></D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`;
    const fileResponse =
      depth === '1'
        ? `<D:response><D:href>${fileHref}</D:href><D:propstat><D:prop><D:displayname>${escapeXml(
            resource.version.originalName
          )}</D:displayname><D:getcontentlength>${String(
            resource.version.sizeBytes
          )}</D:getcontentlength><D:getcontenttype>${DOCX_MIME_TYPE}</D:getcontenttype><D:getetag>&quot;${
            resource.version.checksumSha256
          }&quot;</D:getetag><D:getlastmodified>${resource.version.createdAt.toUTCString()}</D:getlastmodified><D:resourcetype/>${supportedLockXml}${activeLockXml(
            {
              lockActive: resource.lifecycle.lockActive,
              lockExpiresAt: resource.lifecycle.lockExpiresAt,
              lockToken: resource.lockToken,
            }
          )}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`
        : '';
    const xml = `<?xml version="1.0" encoding="utf-8"?><D:multistatus xmlns:D="DAV:">${collectionResponse}${fileResponse}</D:multistatus>`;
    res.set({
      DAV: '1',
      'MS-Author-Via': 'DAV',
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Dhyrium-Session-Phase': resource.lifecycle.phase,
      'X-Dhyrium-Session-Expires': resource.lifecycle.expiresAt.toISOString(),
    });
    res.status(207).send(xml);
  }

  static async officeFile(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const file = await TaskDocumentOfficeService.getPublicFile(
      input.params.token,
      req.method === 'HEAD' ? 'HEAD' : 'GET'
    );
    res.locals.auditUserId = file.session.actorId;
    const quotedName = file.version.originalName.replace(/["\\\r\n]/g, '_');
    res.set({
      'Content-Type': DOCX_MIME_TYPE,
      'Content-Disposition': `attachment; filename="${quotedName}"`,
      'Content-Length': String(file.buffer.length),
      ETag: `"${file.version.checksumSha256}"`,
      'Last-Modified': file.version.createdAt.toUTCString(),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'MS-Author-Via': 'DAV',
      DAV: '1,2',
      Allow: 'OPTIONS, GET, HEAD, PUT, PROPFIND, LOCK, UNLOCK',
      'X-Dhyrium-Session-Phase': file.lifecycle.phase,
      'X-Dhyrium-Session-Expires': file.lifecycle.expiresAt.toISOString(),
    });
    if (req.method === 'HEAD') return res.status(200).send();
    return res.status(200).send(file.buffer);
  }

  static async officeFileOptions(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const file = await TaskDocumentOfficeService.getPublicFile(
      input.params.token,
      'OPTIONS'
    );
    res.locals.auditUserId = file.session.actorId;
    res.set({
      DAV: '1,2',
      'MS-Author-Via': 'DAV',
      Allow: 'OPTIONS, GET, HEAD, PUT, PROPFIND, LOCK, UNLOCK',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Dhyrium-Session-Phase': file.lifecycle.phase,
      'X-Dhyrium-Session-Expires': file.lifecycle.expiresAt.toISOString(),
    });
    res.status(200).send();
  }

  static async officeFileProperties(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const file = await TaskDocumentOfficeService.getPublicFile(
      input.params.token,
      'PROPFIND'
    );
    res.locals.auditUserId = file.session.actorId;
    const href = escapeXml(req.originalUrl.split('?')[0]);
    const displayName = escapeXml(file.version.originalName);
    const lockProperties = `${supportedLockXml}${activeLockXml({
      lockActive: file.lifecycle.lockActive,
      lockExpiresAt: file.lifecycle.lockExpiresAt,
      lockToken: file.lockToken,
    })}`;
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:"><D:response><D:href>${href}</D:href><D:propstat><D:prop><D:displayname>${displayName}</D:displayname><D:getcontentlength>${
      file.buffer.length
    }</D:getcontentlength><D:getcontenttype>${DOCX_MIME_TYPE}</D:getcontenttype><D:getetag>&quot;${
      file.version.checksumSha256
    }&quot;</D:getetag><D:getlastmodified>${file.version.createdAt.toUTCString()}</D:getlastmodified><D:resourcetype/>${lockProperties}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response></D:multistatus>`;
    res.set({
      DAV: '1,2',
      'MS-Author-Via': 'DAV',
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Dhyrium-Session-Phase': file.lifecycle.phase,
      'X-Dhyrium-Session-Expires': file.lifecycle.expiresAt.toISOString(),
    });
    res.status(207).send(xml);
  }

  static async officeFileLock(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const file = await TaskDocumentOfficeService.lockPublicFile({
      token: input.params.token,
      ifHeader: req.headers.if,
      lockTokenHeader: req.headers['lock-token'],
      contentLength: req.headers['content-length'],
      transferEncoding: req.headers['transfer-encoding'],
    });
    res.locals.auditUserId = file.session.actorId;
    const lockToken = file.lockToken;
    const xml = `<?xml version="1.0" encoding="utf-8"?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock><D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth><D:timeout>Second-${Math.max(
      1,
      Math.floor(
        ((file.lifecycle.lockExpiresAt ?? new Date()).getTime() - Date.now()) /
          1000
      )
    )}</D:timeout><D:locktoken><D:href>${lockToken}</D:href></D:locktoken></D:activelock></D:lockdiscovery></D:prop>`;
    res.set({
      'Lock-Token': `<${lockToken}>`,
      DAV: '1,2',
      'MS-Author-Via': 'DAV',
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Dhyrium-Session-Phase': file.lifecycle.phase,
      'X-Dhyrium-Lock-Expires':
        file.lifecycle.lockExpiresAt?.toISOString() ?? '',
    });
    res.status(200).send(xml);
  }

  static async officeFileSave(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(
        'No se recibió el archivo DOCX.',
        400,
        'TASK_DOCUMENT_FILE_REQUIRED'
      );
    }
    const receipt = await TaskDocumentOfficeService.saveFromWord({
      token: input.params.token,
      buffer: req.body,
      ifHeader: req.headers.if,
      ifMatchHeader: req.headers['if-match'],
    });
    res.set({
      ETag: `"${receipt.version.checksumSha256}"`,
      'X-Dhyrium-Version': String(receipt.version.versionNumber),
      'X-Dhyrium-Version-Id': receipt.version.id,
      'X-Dhyrium-Version-Receipt': `${receipt.version.id}:${receipt.version.versionNumber}:${receipt.version.checksumSha256}`,
      'X-Dhyrium-Session-Phase': 'SAVED',
      'Cache-Control': 'private, no-store, max-age=0',
    });
    res.status(204).send();
  }

  static async officeFileUnlock(req: Request, res: Response) {
    const input = taskDocumentOfficeFileSchema.parse({ params: req.params });
    const session = await TaskDocumentOfficeService.releaseByToken(
      input.params.token,
      'word_unlock',
      req.headers['lock-token']
    );
    res.locals.auditUserId = session.actorId;
    res.status(204).send();
  }

  static async preview(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError(
        'No se recibió el documento DOCX.',
        400,
        'TASK_DOCUMENT_PREVIEW_REQUIRED'
      );
    }

    const preview = await TaskDocumentPreviewService.createPdfPreview(req.file);
    const baseName =
      req.file.originalname.replace(/\.docx$/i, '') || 'documento';
    const safeName = baseName.replace(/["\\\r\n]/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}.pdf"`,
      'Cache-Control': 'private, max-age=86400',
      ETag: `"${preview.cacheKey}"`,
      'X-Document-Page-Count': String(preview.pageCount ?? ''),
    });
    res.status(200).send(preview.buffer);
  }

  static async asset(req: Request, res: Response) {
    const input = getTaskDocumentRequestSchema.parse({ params: req.params });
    if (!req.file) {
      throw new AppError(
        'No se recibió el recurso del documento.',
        400,
        'TASK_DOCUMENT_ASSET_REQUIRED'
      );
    }
    const asset = await TaskDocumentsService.saveAsset({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      file: req.file,
      user: getUser(res),
    });
    res.status(201).json(asset);
  }

  static async assetContent(req: Request, res: Response) {
    const input = getTaskDocumentAssetRequestSchema.parse({
      params: req.params,
    });
    const asset = await TaskDocumentsService.getAsset({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      fileName: input.params.fileName,
      user: getUser(res),
    });
    res.set({
      'Content-Type': asset.contentType,
      'Content-Length': String(asset.buffer.length),
      'Content-Disposition': `inline; filename="${input.params.fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    res.status(200).send(asset.buffer);
  }

  static async get(req: Request, res: Response) {
    const input = getTaskDocumentRequestSchema.parse({ params: req.params });
    const document = await TaskDocumentsService.get(
      input.params.taskKind,
      input.params.taskId,
      getUser(res)
    );
    res.status(200).json({ document });
  }

  static async save(req: Request, res: Response) {
    const input = saveTaskDocumentRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const document = await TaskDocumentsService.save({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      user: getUser(res),
      body: input.body,
    });
    res.status(200).json({ document });
  }

  static async versions(req: Request, res: Response) {
    const input = listTaskDocumentVersionsRequestSchema.parse({
      params: req.params,
      query: req.query,
    });
    const versions = await TaskDocumentsService.listVersions(
      input.params.taskKind,
      input.params.taskId,
      input.query.limit,
      getUser(res)
    );
    res.status(200).json({ versions });
  }

  static async restore(req: Request, res: Response) {
    const input = restoreTaskDocumentVersionRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const document = await TaskDocumentsService.restore({
      taskKind: input.params.taskKind,
      taskId: input.params.taskId,
      versionNumber: input.params.versionNumber,
      expectedRevision: input.body.expectedRevision,
      user: getUser(res),
    });
    res.status(200).json({ document });
  }
}

export default TaskDocumentsController;
