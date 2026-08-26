import PayMailServices from '@/services/payMail.services';
import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import type {
  ParametersPayMail,
  PickPayMail,
  PickPayMessageReply,
  PickSealPayMessage,
} from '@/types/types';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { PayMessages } from '@prisma/client';
import { ControllerFunction } from '@/types/patterns';
import { Request } from 'express';
import { parseQueries } from '@/utils/format.server';
import SocketManager from '@/models/SocketManager';

class PayMailControllers {
  public showMessages: ControllerFunction = async (req, res) => {
    const userInfo: UserType = res.locals.userInfo;
    const params = parseQueries<ParametersPayMail>(req.query);
    const query = await PayMailServices.getByUser(userInfo, params);
    res.status(200).json(query);
  };

  public showHoldingMessages: ControllerFunction = async (req, res) => {
    const params = parseQueries<ParametersPayMail>(req.query);
    const query = await PayMailServices.onHolding(params);
    res.status(200).json(query);
  };

  public showMessage: ControllerFunction = async (req, res) => {
    const { id: messageId } = req.params;
    // const { officeId: office } = req.query;
    // const officeId = isQueryNumber(office as string);
    const userInfo: UserType = res.locals.userInfo;
    const query = await PayMailServices.getMessageById(+messageId, userInfo);
    res.status(200).json(query);
  };

  private requestFiles(Request: Request, path: string, att?: boolean) {
    const attempt = att ? `${new Date().getTime()}` : undefined;
    if (!Request.files)
      throw new AppError('Oops!, no se pudo subir los archivos', 400);
    const {
      mainProcedure: main_file,
      rxhFile: rxh,
      fileMail: files,
    } = Request.files as Record<string, Express.Multer.File[]>;
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    const mainFiles =
      main_file?.map(({ filename: name, originalname, ...file }) => {
        renameSync(file.path, path + '/' + 'mp_' + name);
        return { name: 'mp_' + name, path, attempt, originalname };
      }) ?? [];
    const rxhFiles =
      rxh?.map(({ filename: name, originalname, ...file }) => {
        renameSync(file.path, path + '/' + 'rxh_' + name);
        return { name: 'rxh_' + name, path, attempt, originalname };
      }) ?? [];
    const otherFiles = files?.map(
      ({ filename: name, originalname, ...file }) => {
        renameSync(file.path, path + '/' + name);
        return { name, path, originalname, attempt };
      }
    );
    return [...mainFiles, ...rxhFiles, ...(otherFiles ?? [])];
  }

  public createReplyMessage: ControllerFunction = async (req, res) => {
    const { status } = req.query as ParametersPayMail;
    const { id: senderId }: UserType = res.locals.userInfo;
    const { body } = req;
    const files = this.requestFiles(req, `public/mail/${senderId}`);
    const data = JSON.parse(body.data) as PickPayMessageReply;
    const response = await PayMailServices.reply(
      { ...data, status, senderId },
      files
    );
    // const usersId = office?.users.map(({ usersId }) => String(usersId));
    // if (usersId) {
    //   SocketManager.emitNotification(usersId, {
    //     title: 'Tramite de pagos',
    //     from: `${profile.firstName} ${profile.lastName}`,
    //     subject: header,
    //     mailId: id,
    //     typeMail: TypeMailNoti.CONTINUE_MESSAGE,
    //   });
    // }
    // res.status(201).json({ status: 'ok' });
    res.status(201).json(response);
  };

  public declineHoldingStage: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const user: UserType = res.locals.userInfo;
    const query = await PayMailServices.decline(+id, body, user);
    // const { users, header } = query;
    // const usersId = users.map(({ userId }) => String(userId));
    // if (usersId) {
    //   SocketManager.emitNotification(usersId, {
    //     title: 'Tramite de pagos',
    //     from: `${profile.firstName} ${profile.lastName}`,
    //     subject: `RECHAZADO-${header}\n ${query.comment}`,
    //     mailId: +id,
    //     typeMail: TypeMailNoti.CONTINUE_MESSAGE,
    //   });
    // }
    res.status(200).json(query);
  };

  public createSeal: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id: senderId }: UserType = res.locals.userInfo;
    const data = JSON.parse(body.data) as PickSealPayMessage;
    const files = this.requestFiles(req, `public/mail/${senderId}`);
    const result = await PayMailServices.replyWithSeal(data, files, senderId);
    res.json(result);
  };

  public updateMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    const { id: messageId } = req.params;
    const files = this.requestFiles(req, `public/mail/${senderId}`, true);
    const { body } = req;
    const data = JSON.parse(body.data) as PickPayMail;
    const response = await PayMailServices.updateMessage(
      +messageId,
      { ...data, senderId },
      files
    );
    // const usersId = office?.users.map(({ usersId }) => String(usersId));
    // if (usersId) {
    //   SocketManager.emitNotification(usersId, {
    //     title: 'Tramite de pagos',
    //     from: `${profile.firstName} ${profile.lastName}`,
    //     subject: header,
    //     mailId: id,
    //     typeMail: TypeMailNoti.RECEPTION_MESSAGE,
    //   });
    // }
    res.status(200).json(response);
  };

  public updateHoldingStage: ControllerFunction = async (req, res) => {
    const ids: number[] = req.body.ids;
    const query = await PayMailServices.changeHolding(ids, res.locals.userInfo);
    // query.forEach(({ office, id, header }) => {
    //   const usersId = office?.users.map(({ usersId }) => String(usersId));
    //   if (usersId) {
    //     SocketManager.emitNotification(usersId, {
    //       title: 'Tramite de pagos',
    //       from: `${profile.firstName} ${profile.lastName}`,
    //       subject: header,
    //       mailId: id,
    //       typeMail: TypeMailNoti.CONTINUE_MESSAGE,
    //     });
    //   }
    // });
    res.status(200).json(query);
  };

  public createMessage: ControllerFunction = async (req, res) => {
    const { id: senderId }: UserType = res.locals.userInfo;
    //--------------------------------------------------------------------------
    const files = this.requestFiles(req, `public/mail/${senderId}`, true);
    //--------------------------------------------------------------------------
    const { body } = req;
    const data = JSON.parse(body.data) as PickPayMail;
    const query = await PayMailServices.create({ ...data, senderId }, files);
    // const usersId = query.office?.users.map(({ usersId }) => String(usersId));
    // if (usersId) {
    //   SocketManager.emitNotification(usersId, {
    //     title: 'Tramite de pagos',
    //     from: `${profile.firstName} ${profile.lastName}`,
    //     subject: data.header,
    //     mailId: query.id,
    //     typeMail: TypeMailNoti.RECEPTION_MESSAGE,
    //   });
    // }
    res.status(201).json(query);
  };

  public updatePdfPayment: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const query = await PayMailServices.updatePaymentData(+id, body);
    SocketManager.refreshPayMessage(+id);
    res.status(200).json(query);
  };

  public updatePdfData: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const query = await PayMailServices.updatePdfData(+id, body);
    SocketManager.refreshPayMessage(+id);
    res.status(200).json(query);
  };

  public archivedMessage: ControllerFunction = async (req, res) => {
    const { id: messageId } = req.params;
    const query = await PayMailServices.archived(+messageId);
    res.status(200).json(query);
  };

  public archivedList: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await PayMailServices.archivedMany(body);
    res.status(200).json(query);
  };

  public doneMessage: ControllerFunction = async (req, res) => {
    const { id: messageId } = req.params;
    const query = await PayMailServices.done(+messageId);
    SocketManager.refreshPayMessage(+messageId);
    res.status(200).json(query);
  };

  public quantityFiles: ControllerFunction = async (req, res) => {
    const { id }: UserType = res.locals.userInfo;
    const query = await PayMailServices.quantityFiles(id);
    res.status(200).json(query);
  };

  public createPaymentFiles: ControllerFunction = async (req, res) => {
    const { id: messageId } = req.params;
    const { id: senderId }: UserType = res.locals.userInfo;
    const files = this.requestFiles(req, `public/voucher/${senderId}`);
    await PayMailServices.createPaymentFiles(+messageId, files);
    SocketManager.refreshPayMessage(+messageId);
    res.status(200).json(files);
  };

  public createRXHFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { id: senderId }: UserType = res.locals.userInfo;
    const path = `public/voucher/${senderId}`;
    if (!req.file)
      throw new AppError('Oops!, no se pudo subir los archivos', 400);
    const {
      originalname,
      filename: name,
      ...file
    } = req.file as Express.Multer.File;
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    renameSync(file.path, path + '/' + name);
    const result = await PayMailServices.createRXH(+id, {
      path,
      originalname,
      name,
    });
    SocketManager.refreshPayMessage(+id);
    res.status(201).json(result);
  };

  public removeRXHFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const result = await PayMailServices.removeRXH(+id);
    SocketManager.refreshPayMessage(+id);
    res.status(200).json(result);
  };

  public declineVoucher: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const status = req.query.status as PayMessages['status'];
    const query = await PayMailServices.updateVoucher(+id, { status });
    res.status(200).json(query);
  };
}

export default new PayMailControllers();
