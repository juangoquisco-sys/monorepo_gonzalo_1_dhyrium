import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import {
  ParametersMail,
  PickMail,
  PickMessageReply,
  PickSealMessage,
} from '@/types/types';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { Request } from 'express';
import { ControllerFunction } from '@/types/patterns';
import MailServices from '@/services/mail.services';
import { isQueryNumber } from '@/utils/tools';
import { parseQueries } from '@/utils/format.server';
import {
  getAuthorizedMailCategory,
  getAuthorizedMailMessageId,
  getAuthorizedMailMessageIds,
} from '@/middlewares/mail.middleware';

export class MailControllers {
  public showMessages: ControllerFunction = async (req, res) => {
    const params = parseQueries<ParametersMail>(req.query);
    const category = getAuthorizedMailCategory(res);
    const userInfo: UserType = res.locals.userInfo;
    const query = await MailServices.getByUser(userInfo, category, params);
    res.status(200).json(query);
  };

  public showHoldingMessages: ControllerFunction = async (req, res) => {
    const params = parseQueries<ParametersMail>(req.query);
    const query = await MailServices.onHolding(params);
    res.status(200).json(query);
  };

  public showMessage: ControllerFunction = async (req, res) => {
    const messageId = getAuthorizedMailMessageId(res);
    const { officeId: office } = req.query;
    const officeId = isQueryNumber(office as string);
    const userInfo: UserType = res.locals.userInfo;
    const query = await MailServices.getMessage(messageId, userInfo, officeId);
    res.status(200).json(query);
  };

  private requestFiles(Request: Request, path: string, att?: boolean) {
    const attempt = att ? `${new Date().getTime()}` : undefined;
    if (!Request.files)
      throw new AppError('Oops!, no se pudo subir los archivos', 400);
    const { mainProcedure: main_file, fileMail: files } =
      Request.files as Record<string, Express.Multer.File[]>;
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    const mainFiles =
      main_file?.map(({ filename: name, originalname, ...file }) => {
        renameSync(file.path, path + '/' + 'mp_' + name);
        return { name: 'mp_' + name, path, attempt, originalname };
      }) ?? [];
    const otherFiles = files?.map(
      ({ filename: name, originalname, ...file }) => {
        renameSync(file.path, path + '/' + name);
        return { name, path, attempt, originalname };
      }
    );
    return [...mainFiles, ...(otherFiles ?? [])];
  }

  public createMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    const category = getAuthorizedMailCategory(res);
    const files = this.requestFiles(req, `public/mail/${senderId}`, true);
    //--------------------------------------------------------------------------
    const data = JSON.parse(req.body.data) as Omit<PickMail, 'id'>;
    //--------------------------------------------------------------------------
    const query = await MailServices.create(
      { ...data, senderId },
      category,
      files
    );
    res.status(201).json(query);
  };

  public createReplyMessage: ControllerFunction = async (req, res) => {
    const { status } = req.query as ParametersMail;
    const messageId = getAuthorizedMailMessageId(res);
    const { id: senderId }: UserType = res.locals.userInfo;
    const files = this.requestFiles(req, `public/mail/${senderId}`);
    const data = JSON.parse(req.body.data) as PickMessageReply;
    const query = await MailServices.createReply(
      messageId,
      { ...data, status, senderId },
      files
    );
    res.status(201).json(query);
  };

  public declineHoldingStage: ControllerFunction = async (req, res) => {
    const messageId = getAuthorizedMailMessageId(res);
    const { body } = req;
    const user: UserType = res.locals.userInfo;
    const query = await MailServices.decline(messageId, body, user);
    res.status(200).json(query);
  };

  public createSeal: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id: senderId }: UserType = res.locals.userInfo;
    const data = JSON.parse(body.data) as PickSealMessage;
    const files = this.requestFiles(req, `public/mail/${senderId}`);
    const result = await MailServices.updateDataWithSeal(data, files, senderId);
    res.json(result);
  };

  public updateMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    const messageId = getAuthorizedMailMessageId(res);
    const files = this.requestFiles(req, `public/mail/${senderId}`, true);
    const data = JSON.parse(req.body.data) as Omit<PickMail, 'id'>;
    const query = await MailServices.updateMessage(
      messageId,
      { ...data, senderId },
      files
    );
    console.log(query);
    res.status(200).json(query);
  };

  public updateHoldingStage: ControllerFunction = async (req, res) => {
    const ids: number[] = req.body.ids;
    const query = await MailServices.changeHoldingStatus(
      ids,
      res.locals.userInfo
    );
    res.status(200).json(query);
  };

  public archivedMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    const messageId = getAuthorizedMailMessageId(res);
    const query = await MailServices.archived(messageId, senderId);
    res.status(200).json(query);
  };

  public archivedList: ControllerFunction = async (_req, res) => {
    const ids = getAuthorizedMailMessageIds(res);
    const query = await MailServices.archivedList({ ids });
    res.status(200).json(query);
  };

  public doneMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    const messageId = getAuthorizedMailMessageId(res);
    const query = await MailServices.done(messageId, senderId);
    res.status(200).json(query);
  };

  public quantityFiles: ControllerFunction = async (req, res) => {
    const { id }: UserType = res.locals.userInfo;
    const query = await MailServices.quantityFiles(id);
    res.status(200).json(query);
  };
}

export default MailControllers;
