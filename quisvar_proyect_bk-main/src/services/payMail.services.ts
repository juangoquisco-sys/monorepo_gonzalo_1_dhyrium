import { FileMessagePick } from '@/types/types';
import type {
  FilesPayment,
  PayMessages,
  Prisma,
  RxHFile,
  Users,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { UserType } from '@/middlewares/auth.middleware';
import {
  PaymailFilesReplyType,
  PaymailFormCreate,
  PayMailParams,
  PaymailReplyForm,
  PDFPaymentForm,
  SealType,
} from '@/types/paymessage';
import GenerateFiles from '@/utils/generateFile';
import Utilities from '@/utils/utilities';
import Queries from '@/utils/queries';
import PayrollsServices from '@/services/payrolls.services';

class PayMailServices {
  public static async onHolding({
    limit,
    offset,
    page,
    officeId,
    ...options
  }: PayMailParams) {
    const skip = Utilities.getPage({ limit, offset, page });
    const messages = await prisma.payMessages.findMany({
      where: {
        officeId,
        status: options.status,
        onHolding: options.onHolding,
        type: options.typeMessage,
        OR: this.searchName(options.search),
      },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      ...Queries.PayMail()._selectMessage(),
    });
    const total = await prisma.payMessages.count({
      where: {
        officeId,
        status: options.status,
        type: options.typeMessage,
        onHolding: options.onHolding,
        OR: this.searchName(options.search),
      },
    });
    const parseList = messages.map(message => {
      const userInit = message.users.find(user => user.userInit);
      const _message = { ...message, userInit };
      return _message;
    });
    const mail = { total, mailList: parseList };
    return mail;
  }

  public static async changeHolding(
    ids: PayMessages['id'][],
    { id: senderId }: UserType
  ) {
    const now = new Date();
    const updateMessages = ids.map(id => {
      return prisma.payMessages.update({
        where: { id },
        data: {
          onHolding: false,
          onHoldingDate: now,
          history: {
            create: {
              title: 'MESA DE PARTES',
              header: 'Observación',
              description: JSON.stringify({
                office: 'MESA DE PARTES',
                subtitle: `Tramite en espera`,
                status: true,
              }),
              user: { connect: { id: senderId } },
            },
          },
        },
      });
    });
    return await prisma.$transaction(updateMessages);
  }

  public static async getByUser(
    { id: userId }: UserType,
    {
      limit,
      offset,
      page,
      officeId,
      onHolding = false,
      ...options
    }: PayMailParams
  ) {
    const users = !officeId ? { some: { userId, userInit: true } } : undefined;
    const skip = Utilities.getPage({ limit, offset, page });
    const messageList = await prisma.payMessages.findMany({
      where: {
        officeId,
        type: options.typeMessage,
        status: options.status ? options.status : { not: 'ARCHIVADO' },
        users,
        onHolding: officeId ? onHolding : undefined,
        OR: this.searchName(options.search),
      },
      ...Queries.PayMail()._selectMessage(),
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    const total = await prisma.payMessages.count({
      where: {
        type: options.typeMessage,
        officeId,
        status: options.status ? options.status : { not: 'ARCHIVADO' },
        users,
        OR: this.searchName(options.search),
      },
    });
    const mailList = messageList.map(message => {
      const userInit = message.users.find(user => user.userInit);
      const paymessage = { ...message, userInit };
      return { paymessage };
    });
    const mail = { total, mailList };
    return mail;
  }

  public static async getMessageShort(id: PayMessages['id']) {
    if (!id) throw new AppError('Ops!, ID invalido', 400);
    const getMessage = await prisma.payMessages.findUnique({
      where: { id },
      include: {
        office: {
          select: { name: true, quantity: true },
        },
        files: {
          where: { name: { startsWith: 'mp' } },
          orderBy: { attempt: 'desc' },
          take: 1,
        },
      },
    });
    if (!getMessage) throw new AppError('Ops!, ID invalido', 400);
    return getMessage;
  }

  public static async getMessageById(
    id: PayMessages['id'],
    dataUser: UserType
  ) {
    if (!id) throw new AppError('ID invalido', 400);
    const getHistoryOffice = await prisma.payMessages.findUnique({
      where: { id },
      select: { historyOfficesIds: true, users: { where: { userInit: true } } },
    });
    if (getHistoryOffice) {
      const userInit = getHistoryOffice.users.find(user => user.userInit);
      const userOffices = await prisma.users.findUnique({
        where: { id: dataUser.id },
        select: { offices: { select: { officeId: true } } },
      });
      const userOfficesIds = userOffices!.offices.map(({ officeId: id }) => id);
      const containUser = dataUser.id !== userInit?.userId;
      if (containUser) {
        const officeList = getHistoryOffice.historyOfficesIds;
        const containOffice = officeList.some(id =>
          userOfficesIds.includes(id)
        );
        if (!containOffice) throw new AppError('Usuario No autorizado', 401);
      }
    }
    const message = await prisma.payMessages.findUnique({
      where: { id },
      include: {
        users: { include: { user: Queries.selectProfileUser } },
        filesPay: { select: { files: true } },
        rxhFile: true,
        office: { select: { id: true, name: true, quantity: true } },
        files: {
          select: {
            id: true,
            name: true,
            path: true,
            originalname: true,
            attempt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        },
        report: {
          select: {
            id: true,
            name: true,
            price: true,
            subprice: true,
            percentage: true,
            attendanceDiscount: true,
            licensesDiscount: true,
            earlyPaymentDiscount: true,
            payrollId: true,
            userId: true,
          },
        },
        history: {
          include: {
            files: {
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
              select: { id: true, name: true, path: true },
            },
          },
        },
      },
    });
    if (!message)
      throw new AppError('No se pudo encontrar datos del mensaje', 404);
    const mainDocument = message.files[0];
    const files = message.files.map(({ attempt, ...file }) => ({
      ...file,
      assignedAt: new Date(+attempt),
    }));
    const userInit = message.users.find(user => user.userInit);
    const firstReport = message.report[0];
    const penaltySummary =
      firstReport?.payrollId && userInit?.userId
        ? await PayrollsServices.penaltySummary({
            payrollId: firstReport.payrollId,
            userIds: [userInit.userId],
            userInfo: dataUser,
          }).catch(() => null)
        : null;
    const fallbackPenalty =
      penaltySummary?.users.find(user => user.userId === userInit?.userId)
        ?.totalAmount || 0;
    const total = message.report.reduce((acc, report, index) => {
      const baseAmount = Number(report.subprice || report.price || 0);
      const percentage = Number(report.percentage || 100);
      const attendanceDiscount =
        Number(report.attendanceDiscount || 0) ||
        (index === 0 ? Number(fallbackPenalty || 0) : 0);
      const licensesDiscount = Number(report.licensesDiscount || 0);
      const earlyPaymentDiscount = Number(report.earlyPaymentDiscount || 0);
      const payable = Math.max(
        baseAmount * (percentage / 100) -
          attendanceDiscount -
          licensesDiscount -
          earlyPaymentDiscount,
        0
      );
      return acc + payable;
    }, 0);
    return { ...message, files, mainDocument, userInit, total };
  }

  public static async create(
    {
      title,
      description,
      type,
      header,
      senderId,
      officeId,
      reports,
      secondaryReceiver,
    }: PaymailFormCreate,
    files: FileMessagePick[]
  ) {
    const office = await prisma.userToOffice.count({
      where: { usersId: senderId },
    });
    if (!office) throw new AppError('No pertenece a ninguna oficina', 403);
    const users = [
      ...secondaryReceiver,
      { userId: senderId, userInit: true, status: true },
    ];
    const parseReports = reports.map(id => ({ id }));
    const message = await prisma.payMessages.create({
      data: {
        title,
        header,
        description,
        type,
        office: { connect: { id: officeId } },
        // report: { connect: { id: reportId } },
        report: { connect: parseReports },
        users: { createMany: { data: users } },
        files: { createMany: { data: files } },
        historyOfficesIds: [officeId, 1],
      },
    });
    return message;
  }

  public static async createRXH(
    id: PayMessages['id'],
    data: Pick<RxHFile, 'name' | 'originalname' | 'path'>
  ) {
    const rxhFile = await prisma.rxHFile.create({
      data: { ...data, paymessage: { connect: { id } } },
    });
    return rxhFile;
  }

  public static async removeRXH(id: number) {
    const rxhFile = await prisma.rxHFile.delete({
      where: { paymessageId: id },
    });
    return rxhFile;
  }
  public static async decline(
    id: PayMessages['id'],
    { comment }: PayMessages,
    { id: senderId }: UserType
  ) {
    if (!id) throw new AppError('Mensaje no encontrado', 400);
    const messageHistory = {
      title: 'MESA DE PARTES',
      header: 'Observacion',
      description: JSON.stringify({
        office: 'MESA DE PARTES',
        subtitle: `Trámite observado`,
        status: false,
      }),
    };
    const fordward = await prisma.payMessages.update({
      where: { id },
      data: {
        beforeOffice: 'MESA DE PARTES',
        comment,
        // report: { disconnect: { paymessageId: id } },
        report: { set: [] },
        historyOfficesIds: { set: [] },
        officeId: null,
        status: 'OBSERVADO',
        users: { deleteMany: { userInit: false } },
        onHolding: false,
        history: {
          create: { ...messageHistory, user: { connect: { id: senderId } } },
        },
      },
    });
    return fordward;
  }

  public static async reply(
    { officeId, paymessageId: id, status, ...data }: PaymailReplyForm,
    files: PaymailFilesReplyType[]
  ) {
    if (!officeId) throw new AppError('No se encontro la oficina', 400);
    const getOffice = await prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true },
    });
    if (!getOffice) throw new AppError('No se encontro la oficina', 400);
    const description = JSON.stringify({
      office: getOffice.name,
      subtitle: `${status === 'RECHAZADO' ? 'Retornado' : 'Derivado'} con ${
        data.title
      }`,
      status: status === 'RECHAZADO',
    });
    const message = await prisma.payMessages.update({
      where: { id },
      data: {
        status,
        beforeOffice: getOffice.name,
        historyOfficesIds: { push: officeId },
        office: { connect: { id: officeId } },
        files: { createMany: { data: files } },
        history: {
          create: {
            title: data.title,
            header: data.header,
            description,
            user: { connect: { id: data.senderId } },
            files: { createMany: { data: files } },
          },
        },
      },
    });
    return message;
  }

  public static async replyWithSeal(
    { officeId, paymessageId: id, ...data }: SealType,
    files: PaymailFilesReplyType[],
    senderId: number
  ) {
    const getOffice = await prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true },
    });
    if (!getOffice) throw new AppError('No se encontro la oficina', 400);
    const dataSeal = await prisma.payMessages.findUnique({
      where: { id },
      select: {
        id: true,
        positionSeal: true,
        office: { select: { id: true, quantity: true, name: true } },
        files: {
          where: { name: { startsWith: 'mp' } },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 1,
        },
      },
    });
    if (!dataSeal || !dataSeal.office)
      throw new AppError('No se encontro la officina', 400);
    //-------------------------------------------------------------------
    const quantitySeal = data.numberPage
      ? +data.numberPage
      : dataSeal.office.quantity + 1;
    const positionSeal = dataSeal.positionSeal;
    //-------------------------------------------------------------------
    const { name, path } = dataSeal.files[0];
    const destinityFile = path + '/' + name;
    const dateSeal = new Date().toISOString().split('T')[0];
    const parseDateSeal = dateSeal.split('-').reverse().join('-');
    const _numberPage = data.numberPage ? data.numberPage : quantitySeal;
    //-------------------------------------------------------------------
    await GenerateFiles.coverFirma(destinityFile, destinityFile, {
      date: parseDateSeal,
      pos: positionSeal,
      to: data.to,
      observation: data.observations,
      title: dataSeal.office.name,
      numberPage: _numberPage,
    });
    //-------------------------------------------------------------------
    const description = JSON.stringify({
      office: dataSeal.office.name,
      subtitle: `Derivado a ${dataSeal?.office.name} con sello de proveido N° ${_numberPage}`,
      status: true,
    });
    const createForward = await prisma
      .$transaction([
        prisma.payMessages.update({
          where: { id: dataSeal.id },
          data: {
            historyOfficesIds: { push: officeId },
            beforeOffice: dataSeal.office.name,
            positionSeal: positionSeal + 1,
            office: { connect: { id: officeId } },
            history: {
              create: {
                title: data.title,
                description,
                header: '(proveido)/' + dataSeal.office.name,
                user: { connect: { id: senderId } },
                files: { createMany: { data: files } },
              },
            },
          },
        }),
        prisma.office.update({
          where: { id: dataSeal.office.id },
          data: { quantity: quantitySeal + 1 },
        }),
      ])
      .then(res => res[0]);
    return createForward;
  }

  public static async updateMessage(
    id: PayMessages['id'],
    {
      title,
      description,
      type,
      header,
      senderId,
      officeId,
      // reportId,
      reports,
      secondaryReceiver,
    }: PaymailFormCreate,
    files: FileMessagePick[]
  ) {
    if (!officeId || !senderId) throw new AppError('Ingrese Destinatario', 400);
    const office = await prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new AppError('Opps, oficina inexistente', 404);
    const parseReports = reports.map(id => ({ id }));
    const updateMessage = await prisma.payMessages.update({
      where: { id },
      data: {
        header,
        title,
        officeId,
        type,
        description,
        onHolding: true,
        onHoldingDate: new Date(),
        historyOfficesIds: [officeId, 1],
        status: 'PROCESO',
        report: { connect: parseReports },
        users: {
          updateMany: { where: { userInit: true }, data: { status: true } },
          createMany: { data: secondaryReceiver },
        },
        files: { createMany: { data: files } },
      },
    });
    return updateMessage;
  }

  public static async archived(id: PayMessages['id']) {
    if (!id) throw new AppError('No se encontro el mensaje', 400);
    const archiveItem = await prisma.payMessages.update({
      where: { id },
      data: {
        status: 'ARCHIVADO',
        users: {
          updateMany: { where: { paymessageId: id }, data: { status: false } },
        },
      },
    });
    return archiveItem;
  }

  public static async archivedMany({ ids }: { ids: PayMessages['id'][] }) {
    const updateList = ids.map(id =>
      prisma.payMessages.update({
        where: { id },
        data: {
          status: 'ARCHIVADO',
          users: {
            updateMany: {
              where: { paymessageId: id },
              data: { status: false },
            },
          },
        },
      })
    );
    return await prisma.$transaction(updateList);
  }

  public static async done(id: PayMessages['id']) {
    if (!id) throw new AppError('Ops, ID invalido', 400);
    const resolve = await prisma.payMessages.update({
      where: { id },
      data: {
        status: 'PAGADO',
        users: {
          updateMany: {
            where: { paymessageId: id, type: 'SENDER', status: true },
            data: { status: false },
          },
        },
      },
    });
    return resolve;
  }

  public static async createPaymentFiles(
    paymessageId: PayMessages['id'],
    filesInfo: Pick<FilesPayment, 'name' | 'path' | 'originalname'>[]
  ) {
    const createdFiles = await prisma.payment.create({
      data: { paymessageId, files: { createMany: { data: filesInfo } } },
    });
    return createdFiles;
  }

  static async updatePaymentData(
    id: PayMessages['id'],
    { paymentPdfData, ...data }: PDFPaymentForm
  ) {
    if (!id) throw new AppError('Ops, ID invalido', 400);
    const findMessage = await prisma.payMessages.findUnique({
      where: { id },
      select: { paymentPdfData: true },
    });
    if (!findMessage) throw new AppError('Ops, No se encontró el tramite', 400);
    //_--------------------------------------------------------------------
    const orderQuantity = findMessage.paymentPdfData
      ? undefined
      : data.ordenNumber + 1;
    //_--------------------------------------------------------------------
    const resolve = [
      prisma.payMessages.update({ where: { id }, data: { paymentPdfData } }),
      prisma.companies.update({
        where: { id: data.companyId },
        data: { orderQuantity },
      }),
    ];
    return await prisma.$transaction(resolve).then(res => res[1]);
  }

  public static async updatePdfData(
    id: PayMessages['id'],
    { paymentPdfData }: PDFPaymentForm
  ) {
    if (!id) throw new AppError('Ops, ID invalido', 400);
    const findMessage = await prisma.payMessages.findUnique({
      where: { id },
      select: { paymentPdfData: true },
    });
    if (!findMessage) throw new AppError('Ops, No se encontró el tramite', 400);
    //--------------------------------------------------------------------
    const resolve = await prisma.payMessages.update({
      where: { id },
      data: { paymentPdfData },
    });
    return resolve;
  }

  public static async updateVoucher(
    id: PayMessages['id'],
    { status }: Pick<PayMessages, 'status'>
  ) {
    if (!['FINALIZADO', 'PAGADO'].includes(status))
      throw new AppError('Ingrese un estado valido para este proceso', 400);
    const paidMessage = await prisma.payMessages.update({
      where: { id },
      data: { status },
    });
    return paidMessage;
  }

  static async quantityFiles(userId: Users['id']) {
    const quantity = await prisma.payMessages.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { status: { not: 'ARCHIVADO' }, users: { some: { userId } } },
    });
    return quantity;
  }
  private static searchName(contains?: string) {
    if (!contains) return undefined;
    const mode: Prisma.QueryMode = 'insensitive';
    const searchOptions = { contains, mode };
    const header = searchOptions;
    const profile = [{ lastName: searchOptions }, { firstName: searchOptions }];
    const users = { some: { user: { profile: { OR: profile } } } };
    return [{ header }, { users }];
  }
}
export default PayMailServices;
