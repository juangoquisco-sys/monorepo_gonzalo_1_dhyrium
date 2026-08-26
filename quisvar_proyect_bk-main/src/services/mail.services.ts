import { Mail, Messages, Prisma, Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import {
  FileMessagePick,
  PickMail,
  PickMessageReply,
  PickSealMessage,
  ReceiverT,
  ReceiverT2,
  ReceiverTypeMailPick,
} from '@/types/types';
import Queries from '@/utils/queries';
import AppError from '@/utils/appError';
import { UserType } from '@/middlewares/auth.middleware';
import GenerateFiles from '@/utils/generateFile';
import Utilities from '@/utils/utilities';
import { MailParams } from '@/types/message';

type UpdateMessage = Pick<
  PickMessageReply,
  'senderId' | 'receiverId' | 'header' | 'description' | 'title'
> & { officeId: number };
class MailServices {
  public static async getCategoryById(
    id: Messages['id']
  ): Promise<Messages['category']> {
    const message = await prisma.messages.findUnique({
      where: { id },
      select: { category: true },
    });
    if (!message)
      throw new AppError('No se pudo encontrar el trámite solicitado', 404);
    return message.category;
  }

  public static async getCategoriesByIds(ids: Messages['id'][]) {
    const uniqueIds = [...new Set(ids)];
    const messages = await prisma.messages.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, category: true },
    });
    if (messages.length !== uniqueIds.length) {
      throw new AppError('Uno o más trámites no existen', 404);
    }
    return messages;
  }

  public static async onHolding({
    offset,
    limit: take,
    officeId,
    typeMessage,
    onHolding,
    page,
    status,
    ...options
  }: MailParams) {
    const skip = Utilities.getPage({ offset, page, limit: take });
    const mailList = await prisma.messages.findMany({
      where: {
        officeId,
        status,
        type: typeMessage,
        onHolding,
        category: 'DIRECT',
        OR: this.searchName(options.search),
      },
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      ...Queries.PayMail().selectMessage(),
    });
    const total = await prisma.messages.count({
      where: {
        officeId,
        status,
        type: typeMessage,
        onHolding,
        category: 'DIRECT',
      },
    });
    const parseList = mailList.map(message => {
      const userInit = message.users.find(user => user.userInit);
      const _message = { ...message, userInit };
      return _message;
    });
    const mail = { total, mailList: parseList };
    return mail;
  }

  public static async changeHoldingStatus(
    ids: number[],
    { id: senderId }: UserType
  ) {
    const now = new Date();

    const updateMessages = ids.map(id => {
      return prisma.messages.update({
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
    category: Messages['category'],
    {
      offset,
      type,
      status,
      typeMessage,
      officeId,
      limit: take,
      page,
      ...options
    }: MailParams
  ) {
    const onHolding = type === 'SENDER' ? undefined : false;
    //----------------------------------------------------------------
    const userFindByOffice = officeId
      ? await prisma.userToOffice.findUnique({
          where: { usersId_officeId: { officeId, usersId: userId } },
        })
      : null;
    const managerOffice = officeId
      ? await prisma.office.findUnique({
          where: { id: officeId },
          select: { users: { where: { isOfficeManager: true }, take: 1 } },
        })
      : null;
    if (officeId && !managerOffice)
      throw new AppError('Error, oficina, sin gerente', 404);
    const historyOfficesIds = userFindByOffice
      ? { hasSome: [userFindByOffice.officeId] }
      : undefined;
    //----------------------------------------------------------------
    const newUser = officeId ? managerOffice?.users[0].usersId : userId;
    const skip = Utilities.getPage({ offset, page, limit: take });
    const mail = await prisma.mail.findMany({
      where: {
        userId: newUser,
        type,
        message: {
          type: typeMessage,
          status: status ? status : { not: 'ARCHIVADO' },
          category,
          onHolding,
          historyOfficesIds,
          OR: this.searchName(options.search),
        },
      },
      orderBy: { message: { updatedAt: 'desc' } },
      skip,
      take,
      select: {
        messageId: true,
        status: true,
        type: true,
        userInit: true,
        message: Queries.PayMail().selectMessage(),
      },
    });
    const parseList = mail.map(({ message, ...data }) => {
      const userInit = message.users.find(user => user.userInit);
      const _message = { ...message, userInit };
      return { ...data, message: _message };
    });
    const total = await prisma.mail.count({
      where: {
        userId: newUser,
        type,
        message: {
          status: status ? status : { not: 'ARCHIVADO' },
          type: typeMessage,
          category,
          onHolding,
          historyOfficesIds,
        },
      },
    });
    return { total, mailList: parseList };
  }

  static async getMessageShort(id: Messages['id']) {
    if (!id) throw new AppError('Ops!, ID invalido', 400);
    const getMessage = await prisma.messages.findUnique({
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

  public static async getMessage(
    id: Messages['id'],
    dataUser: UserType,
    officeId?: number
  ) {
    if (!id) throw new AppError('Ops!, ID invalido', 400);
    if (officeId === 0) throw new AppError('Ops!, officina inválida', 400);
    const getMessage = await prisma.messages.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            userInit: true,
            userId: true,
            type: true,
            role: true,
            status: true,
            user: Queries.selectProfileUser,
          },
        },
        files: {
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          select: { id: true, name: true, path: true, attempt: true },
        },
        history: {
          include: {
            files: {
              orderBy: { id: 'desc' },
              select: { id: true, name: true, path: true },
            },
            user: Queries.selectProfileUser,
          },
        },
        office: { select: { id: true, name: true, quantity: true } },
      },
    });
    if (!getMessage)
      throw new AppError('No se pudo encontrar datos del mensaje', 404);
    const officeAth = officeId;
    //  || getMessage.officeId;
    //---------------------------------------------------------------------
    const isUserOnOffice = officeAth
      ? await prisma.userToOffice.findUnique({
          where: {
            usersId_officeId: { usersId: dataUser.id, officeId: officeAth },
          },
          select: {
            office: {
              select: {
                name: true,
                users: { where: { isOfficeManager: true } },
              },
            },
          },
        })
      : null;
    let users = [];
    //---------------------------------------------------------------------
    if (isUserOnOffice) {
      const { id, ruc, address } = dataUser;
      const userSessionData = { id, ruc, address };
      const { firstName, lastName, dni, degree, description, job } =
        dataUser.profile;
      const profile = {
        firstName,
        lastName,
        dni,
        degree,
        description,
        job,
      };
      const userSession = { ...userSessionData, profile };
      const managerUser = isUserOnOffice.office.users[0];
      if (!managerUser)
        throw new AppError('Error, gerente de oficina no encontrado', 404);
      const manager = getMessage.users.find(
        ({ userId }) => userId === managerUser.usersId
      );
      if (!manager)
        throw new AppError('Error, gerente de oficina inexistente', 404);
      const { role, type, userInit, status } = manager;
      const dataManager = { role, type, userInit, status };
      const parseUsers = getMessage.users.filter(
        ({ userId }) => userId !== dataUser.id
      );
      const userWithOffice = {
        ...dataManager,
        userId: dataUser.id,
        user: userSession,
      };
      users = [...parseUsers, userWithOffice];
    } else {
      users = [...getMessage.users];
    }
    const userInit = getMessage.users.find(({ userInit }) => userInit);
    const mainDocument = getMessage.files[0];
    return { ...getMessage, userInit, users, mainDocument };
  }

  static async getMessagePreview(id: Messages['id']) {
    if (!id) throw new AppError('Ops!, ID invalido', 400);
    const getPayMessage = await prisma.messages.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        header: true,
        description: true,
        type: true,
        createdAt: true,
        files: { select: { id: true, name: true, path: true } },
      },
    });
    if (!getPayMessage)
      throw new AppError('No se pudo encontrar datos del mensaje', 404);
    return getPayMessage;
  }

  public static async create(
    {
      title,
      description,
      type,
      header,
      officeId,
      senderId,
      receiverId,
      secondaryReceiver,
    }: Omit<PickMail, 'id'>,
    category: Messages['category'],
    files: FileMessagePick[]
  ) {
    const typeMail: Mail['type'] = 'SENDER';
    const role: Mail['role'] = 'MAIN';
    const status = true;
    if (category === 'GLOBAL') {
      const createMessage = await prisma.messages.create({
        data: {
          title,
          header,
          description,
          type,
          category,
          onHolding: false,
          onHoldingDate: new Date(),
          users: {
            createMany: {
              data: [
                ...secondaryReceiver,
                { userId: senderId, role, type: typeMail, userInit: true },
              ],
              skipDuplicates: true,
            },
          },
          files: { createMany: { data: files } },
        },
      });
      return createMessage;
    }
    const getUserOffice = officeId
      ? await prisma.office.findUnique({
          where: { id: officeId },
          select: {
            users: {
              where: { isOfficeManager: true },
              select: { usersId: true },
              take: 1,
            },
          },
        })
      : null;
    const receiverList: ReceiverTypeMailPick[] = getUserOffice
      ? [{ userId: getUserOffice.users[0].usersId, role, status }]
      : [{ userId: receiverId, role, status }];
    const historyOfficesIds = getUserOffice ? [officeId] : [];
    const users = [
      ...receiverList,
      { userId: senderId, role, type: typeMail, userInit: true },
    ];
    const createMessage = await prisma.messages.create({
      data: {
        title,
        header,
        description,
        type,
        category,
        officeId,
        historyOfficesIds,
        users: { createMany: { data: users, skipDuplicates: true } },
        files: { createMany: { data: files } },
      },
    });
    return createMessage;
  }

  public static async decline(
    id: Messages['id'],
    { comment }: { comment: string },
    { id: senderId }: UserType
  ) {
    if (!id) throw new AppError('Ops!, ID invalido', 400);
    const messageHistory = {
      title: 'MESA DE PARTES',
      header: 'Observacion',
      description: JSON.stringify({
        office: 'MESA DE PARTES',
        subtitle: `Trámite observado`,
        status: false,
      }),
    };
    const fordward = await prisma.messages.update({
      where: { id },
      data: {
        beforeOffice: 'MESA DE PARTES',
        comment,
        historyOfficesIds: { set: [] },
        officeId: null,
        status: 'OBSERVADO',
        users: {
          updateMany: {
            where: { userInit: true },
            data: {
              type: 'RECEIVER',
              status: true,
            },
          },
          deleteMany: { userInit: false },
        },
        onHolding: false,
        history: {
          create: { ...messageHistory, user: { connect: { id: senderId } } },
        },
      },
    });
    return fordward;
  }

  public static async createReply(
    id: number,
    {
      receiverId,
      senderId,
      officeId,
      status,
      // messageId: id,
      ...data
    }: Omit<
      PickMessageReply,
      | 'messageId'
      | 'paymessageId'
      | 'createdAt'
      | 'id'
      | 'userId'
      | 'description'
    >,
    files: Pick<FileMessagePick, 'name' | 'path'>[]
  ) {
    const receiv: ReceiverT = { type: 'RECEIVER', role: 'MAIN', status: true };
    //-------------------------- Set New Office ---------------------------------
    const getOffice = officeId
      ? await prisma.office.findUnique({
          where: { id: officeId },
          select: {
            id: true,
            users: {
              where: { isOfficeManager: true },
              select: { usersId: true },
              take: 1,
            },
          },
        })
      : null;
    //---------------------------------------------------------------------------
    const getSender = await prisma.messages.findUnique({
      where: { id },
      select: {
        historyOfficesIds: true,
        office: {
          select: {
            id: true,
            name: true,
            users: {
              where: { isOfficeManager: true },
              select: { usersId: true },
              take: 1,
            },
          },
        },
      },
    });
    if (getSender?.office && getSender?.office?.id === officeId)
      throw new AppError('No puedes mandar a la misma oficina', 409);
    //---------------------------------------------------------------------------
    const newReceiver = getOffice ? getOffice.users[0].usersId : receiverId;
    const newSender = getSender?.office
      ? getSender.office.users[0].usersId
      : senderId;
    if (getOffice) {
      const existOffice = getSender?.historyOfficesIds.find(
        id => id === getOffice.id
      );
      const historyOfficesIds = existOffice
        ? undefined
        : [...(getSender?.historyOfficesIds ?? []), getOffice.id];
      await prisma.messages.update({
        where: { id },
        data: {
          officeId: officeId ? officeId : null,
          beforeOffice: getSender?.office?.name,
          historyOfficesIds,
        },
      });
    }
    //---------------------------------------------------------------------------
    if (!newReceiver || !newSender)
      throw new AppError('Ingrese Destinatario', 400);
    const description = JSON.stringify({
      office: getSender?.office?.name,
      subtitle: `${status === 'RECHAZADO' ? 'Retornado' : 'Derivado'} con ${
        data.title
      }`,
      status: status === 'RECHAZADO',
    });
    const createForward = await prisma
      .$transaction([
        prisma.mail.upsert({
          where: {
            userId_messageId: { messageId: id, userId: newReceiver },
          },
          update: { ...receiv },
          create: { messageId: id, userId: newReceiver, ...receiv },
        }),
        prisma.mail.update({
          where: { userId_messageId: { messageId: id, userId: newSender } },
          data: { type: 'SENDER', status: true },
        }),
        prisma.messageHistory.create({
          data: {
            ...data,
            description,
            user: { connect: { id: senderId } },
            message: { connect: { id } },
            files: { createMany: { data: files } },
          },
        }),
      ])
      .then(res => res[2]);
    return createForward;
  }

  static async updateDataWithSeal(
    {
      title,
      officeId,
      messageId: id,
      numberPage,
      observations,
      to,
    }: // ...data
    PickSealMessage,
    files: Pick<FileMessagePick, 'name' | 'path'>[],
    senderId: number
  ) {
    const receiv: ReceiverT = { type: 'RECEIVER', role: 'MAIN', status: true };
    //-------------------------- Set New Office ---------------------------------
    const getOffice = await prisma.office.findUnique({
      where: { id: officeId },
      select: {
        name: true,
        users: {
          where: { isOfficeManager: true },
          select: { usersId: true },
          take: 1,
        },
      },
    });
    //---------------------------------------------------------------------------
    const getSender = await prisma.messages.findUnique({
      where: { id },
      select: {
        id: true,
        category: true,
        positionSeal: true,
        historyOfficesIds: true,
        files: {
          where: { name: { startsWith: 'mp' } },
          orderBy: { attempt: 'desc' },
          take: 1,
        },
        officeId: true,
        office: {
          select: {
            id: true,
            quantity: true,
            name: true,
            users: {
              where: { isOfficeManager: true },
              select: { usersId: true },
              take: 1,
            },
          },
        },
      },
    });
    //---------------------------------------------------------------------------
    if (!getSender || !getSender.office)
      throw new AppError('Error, no existe oficina oficina', 404);
    if (getSender.category !== 'DIRECT')
      throw new AppError(
        'El sello de proveído solo está disponible para trámites regulares',
        400
      );
    if (!getOffice || !getOffice.users)
      throw new AppError('Error, no existe oficina oficina', 404);
    if (getSender.office?.id === officeId)
      throw new AppError('No puedes mandar a la misma oficina', 409);
    //---------------------------------------------------------------------------
    const newReceiver = getOffice.users[0].usersId;
    const newSender = getSender.office.users[0].usersId;
    //---------------------------------------------------------------------------
    if (!newReceiver || !newSender)
      throw new AppError('Ingrese Destinatario', 400);
    const quantitySeal = numberPage
      ? +numberPage
      : getSender.office?.quantity + 1;
    const positionSeal = getSender.positionSeal;
    //---------------------------------------------------------------------------
    const { historyOfficesIds: listOfficeIds } = getSender;
    const existOffice = listOfficeIds.find(id => id === officeId);
    //-------------------------------------------------------------------
    const { name, path } = getSender.files[0];
    const destinityFile = path + '/' + name;
    const dateSeal = new Date().toISOString().split('T')[0];
    const parseDateSeal = dateSeal.split('-').reverse().join('-');
    //-------------------------------------------------------------------
    const _numberPage = numberPage ? numberPage : quantitySeal;
    await GenerateFiles.coverFirma(destinityFile, destinityFile, {
      date: parseDateSeal,
      pos: positionSeal,
      to: to,
      observation: observations,
      title: getSender.office.name,
      numberPage: _numberPage,
    });
    //-------------------------------------------------------------------
    const description = JSON.stringify({
      office: getSender.office.name,
      subtitle: `Derivado a ${getSender?.office.name} con sello de proveido N° ${_numberPage}`,
      status: true,
    });
    //-------------------------------------------------------------------
    const createForward = await prisma
      .$transaction([
        prisma.messages.update({
          where: { id: getSender.id },
          data: {
            officeId,
            historyOfficesIds: { push: existOffice ? officeId : undefined },
            beforeOffice: getSender?.office?.name,
            positionSeal: positionSeal + 1,
          },
        }),
        prisma.office.update({
          where: { id: getSender.office.id },
          data: { quantity: quantitySeal + 1 },
        }),
        prisma.messageHistory.create({
          data: {
            title: title,
            description,
            header: '(proveido)/' + getSender.office.name,
            user: { connect: { id: senderId } },
            message: { connect: { id } },
            files: { createMany: { data: files } },
          },
        }),
        prisma.mail.upsert({
          where: {
            userId_messageId: { messageId: id, userId: newReceiver },
          },
          update: { ...receiv },
          create: { messageId: id, userId: newReceiver, ...receiv },
        }),
        prisma.mail.update({
          where: { userId_messageId: { messageId: id, userId: newSender } },
          data: { type: 'SENDER', status: false },
        }),
      ])
      .then(res => res[2]);
    return createForward;
  }

  public static async updateMessage(
    id: Messages['id'],
    { receiverId, officeId, ...data }: UpdateMessage,
    files: FileMessagePick[]
  ) {
    const getUserOffice = officeId
      ? await prisma.office.findUnique({
          where: { id: officeId },
          select: {
            id: true,
            users: {
              where: { isOfficeManager: true },
              select: { usersId: true },
              take: 1,
            },
          },
        })
      : null;
    const newReceiver = getUserOffice
      ? getUserOffice.users[0].usersId
      : receiverId;
    if (!newReceiver) throw new AppError('Ingrese Destinatario', 400);
    const getMessage = await prisma.messages.findUnique({
      where: { id },
      select: { office: { select: { name: true } }, status: true },
    });
    if (!getMessage) throw new AppError('Ingrese Destinatario', 400);
    const queries = [
      prisma.messages.update({
        where: { id },
        data: {
          header: data.header,
          description: data.description,
          onHolding: getMessage.status === 'OBSERVADO',
          beforeOffice: getMessage.office?.name,
          officeId: getUserOffice ? getUserOffice.id : null,
          title: data.title,
          historyOfficesIds: {
            push: getUserOffice ? [getUserOffice.id, 1] : [1],
          },
          status: 'PENDIENTE',
          files: { createMany: { data: files } },
        },
      }),
      prisma.mail.updateMany({
        where: { userInit: true },
        data: { type: 'SENDER', role: 'MAIN', status: false },
      }),
      prisma.mail.upsert({
        where: { userId_messageId: { messageId: id, userId: newReceiver } },
        update: { type: 'RECEIVER', role: 'MAIN', status: true },
        create: {
          userId: newReceiver,
          type: 'RECEIVER',
          role: 'MAIN',
          status: true,
          messageId: id,
        },
      }),
    ];
    return await prisma.$transaction(queries).then(res => res[0]);
  }

  public static async archived(id: Messages['id'], senderId: number) {
    const archived = await prisma.messages.update({
      where: { id },
      data: {
        status: 'ARCHIVADO',
        users: {
          updateMany: { where: { messageId: id }, data: { ...this.dataDone } },
        },
      },
    });
    await prisma.mail.update({
      where: { userId_messageId: { messageId: id, userId: senderId } },
      data: { type: 'SENDER' },
    });
    return archived;
  }

  static async archivedList({ ids }: { ids: Messages['id'][] }) {
    const updateList = ids.map(id =>
      prisma.messages.update({
        where: { id },
        data: {
          status: 'ARCHIVADO',
          users: {
            updateMany: {
              where: { messageId: id },
              data: { status: false },
            },
          },
        },
      })
    );
    return await prisma.$transaction(updateList);
  }

  public static readonly dataDone: ReceiverT2 = {
    // type: 'RECEIVER',
    role: 'SECONDARY',
    status: false,
  };

  public static async done(id: Messages['id'], senderId: number) {
    if (!id) throw new AppError('Ops, ID invalido', 400);
    if (!senderId) throw new AppError('Ingrese Destinatario', 400);
    const done = await prisma.messages.update({
      where: { id },
      data: {
        status: 'FINALIZADO',
        users: {
          updateMany: { where: { messageId: id }, data: { ...this.dataDone } },
        },
      },
    });
    return done;
  }

  static async updateStatus(id: Messages['id'], status: Messages['status']) {
    const updateStatus = await prisma.messages.update({
      where: { id },
      data: { status },
    });
    return updateStatus;
  }

  static async archivedItem(messageId: Messages['id']) {
    const archivedList = await prisma.mail.updateMany({
      where: { messageId, type: 'RECEIVER' },
      data: { status: false },
    });
    return archivedList;
  }

  public static async quantityFiles(userId: Users['id']) {
    const quantity = await prisma.messages.groupBy({
      by: ['type'],
      _count: { type: true },
      where: {
        type: { not: 'MEMORANDUM_GLOBAL' },
        users: {
          some: { userId },
        },
      },
    });
    const global = await prisma.messages.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { type: 'MEMORANDUM_GLOBAL' },
    });
    const total = [...quantity, ...global];
    return total;
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
export default MailServices;
