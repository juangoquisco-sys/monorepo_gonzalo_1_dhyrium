export enum MessageStatus {
  PROCESO = 'PROCESO',
  RECHAZADO = 'RECHAZADO',
  PENDIENTE = 'PENDIENTE',
  ARCHIVADO = 'ARCHIVADO',
  FINALIZADO = 'FINALIZADO',
  GUARDADO = 'GUARDADO',
  POR_PAGAR = 'POR_PAGAR',
  EN_ESPERA = 'EN_ESPERA',
  PAGADO = 'PAGADO',
  OBSERVADO = 'OBSERVADO',
}

export enum MsgSwitch {
  RECHAZADO = 'RECHAZADO',
  PROCESO = 'PROCESO',
}

export enum MessageUser {
  SENDER = 'SENDER',
  RECEIVER = 'RECEIVER',
  RECEPTION = 'RECEPTION',
  VIEWER = 'VIEWER',
  CC = 'CC',
}

export enum MessagePermission {
  VIEW_MESSAGE_FORM = 'VIEW_MESSAGE_FORM',
  VIEW_SWITCH_REPLY = 'VIEW_SWITCH_REPLY',
  VIEW_HEADER_OPTIONS = 'VIEW_HEADER_OPTIONS',
  VIEW_MESSAGE_INFO = 'VIEW_MESSAGE_INFO',
  VIEW_COMMENT_MESSAGE_INFO = 'VIEW_COMMENT_MESSAGE_INFO',
  VIEW_REGISTER_VOUCHER = 'VIEW_REGISTER_VOUCHER',
  VIEW_DENIED_ACCEPT_VOUCHER = 'VIEW_DENIED_ACCEPT_VOUCHER',
  VIEW_MESSAGE_DECLINE = 'VIEW_MESSAGE_DECLINE',
  INTERACT_IN_DECLINE_MESSAGE = 'INTERACT_IN_DECLINE_MESSAGE',
  EDIT_ORDER_SERVICE = 'EDIT_ORDER_SERVICE',
  FINISH_PROCEDURE = 'FINISH_PROCEDURE',
  CONTINUE_PROCEDURE = 'CONTINUE_PROCEDURE',
}

const {
  VIEW_COMMENT_MESSAGE_INFO,
  VIEW_MESSAGE_DECLINE,
  VIEW_REGISTER_VOUCHER,
  VIEW_MESSAGE_FORM,
  VIEW_SWITCH_REPLY,
  VIEW_MESSAGE_INFO,
  VIEW_HEADER_OPTIONS,
  INTERACT_IN_DECLINE_MESSAGE,
  EDIT_ORDER_SERVICE,
  FINISH_PROCEDURE,
  CONTINUE_PROCEDURE,
} = MessagePermission;

export const PayMessageUserPermissions: Record<
  MessageUser,
  Partial<Record<MessageStatus, MessagePermission[]>>
> = {
  [MessageUser.VIEWER]: {
    [MessageStatus.PROCESO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.ARCHIVADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.EN_ESPERA]: [VIEW_MESSAGE_INFO],
    [MessageStatus.FINALIZADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.POR_PAGAR]: [VIEW_MESSAGE_INFO],
    [MessageStatus.RECHAZADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.OBSERVADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.PENDIENTE]: [VIEW_MESSAGE_INFO],
    [MessageStatus.PAGADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.GUARDADO]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.SENDER]: {
    [MessageStatus.PROCESO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.EN_ESPERA]: [VIEW_MESSAGE_INFO],
    [MessageStatus.FINALIZADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.POR_PAGAR]: [VIEW_REGISTER_VOUCHER, VIEW_MESSAGE_INFO],

    [MessageStatus.PAGADO]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.RECEIVER]: {
    [MessageStatus.PROCESO]: [
      VIEW_MESSAGE_INFO,
      VIEW_HEADER_OPTIONS,
      CONTINUE_PROCEDURE,
      VIEW_MESSAGE_FORM,
      VIEW_SWITCH_REPLY,
    ],
    [MessageStatus.FINALIZADO]: [VIEW_REGISTER_VOUCHER, VIEW_MESSAGE_INFO],
    [MessageStatus.POR_PAGAR]: [
      VIEW_MESSAGE_INFO,
      VIEW_MESSAGE_FORM,
      EDIT_ORDER_SERVICE,
      FINISH_PROCEDURE,
      VIEW_HEADER_OPTIONS,
    ],
    [MessageStatus.OBSERVADO]: [
      VIEW_MESSAGE_DECLINE,
      VIEW_MESSAGE_INFO,
      VIEW_COMMENT_MESSAGE_INFO,
    ],
    [MessageStatus.RECHAZADO]: [VIEW_MESSAGE_INFO, VIEW_MESSAGE_DECLINE],
    [MessageStatus.PAGADO]: [
      VIEW_MESSAGE_INFO,
      VIEW_MESSAGE_FORM,
      EDIT_ORDER_SERVICE,
    ],
  },
  [MessageUser.CC]: {
    [MessageStatus.PROCESO]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.RECEPTION]: {
    [MessageStatus.EN_ESPERA]: [
      VIEW_MESSAGE_INFO,
      VIEW_COMMENT_MESSAGE_INFO,
      INTERACT_IN_DECLINE_MESSAGE,
    ],
  },
};
export const RegularMessageUserPermissions: Record<
  MessageUser,
  Partial<Record<MessageStatus, MessagePermission[]>>
> = {
  [MessageUser.VIEWER]: {
    [MessageStatus.ARCHIVADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.EN_ESPERA]: [VIEW_MESSAGE_INFO],
    [MessageStatus.FINALIZADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.POR_PAGAR]: [VIEW_MESSAGE_INFO],
    [MessageStatus.RECHAZADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.OBSERVADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.PENDIENTE]: [VIEW_MESSAGE_INFO],
    [MessageStatus.PAGADO]: [VIEW_MESSAGE_INFO],
    [MessageStatus.GUARDADO]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.SENDER]: {
    [MessageStatus.PENDIENTE]: [VIEW_MESSAGE_INFO],
    [MessageStatus.EN_ESPERA]: [VIEW_MESSAGE_INFO],
    [MessageStatus.FINALIZADO]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.RECEIVER]: {
    [MessageStatus.PENDIENTE]: [
      VIEW_MESSAGE_INFO,
      VIEW_HEADER_OPTIONS,
      CONTINUE_PROCEDURE,
      VIEW_MESSAGE_FORM,
      VIEW_SWITCH_REPLY,
    ],
    [MessageStatus.FINALIZADO]: [VIEW_REGISTER_VOUCHER, VIEW_MESSAGE_INFO],

    [MessageStatus.OBSERVADO]: [
      VIEW_MESSAGE_DECLINE,
      VIEW_MESSAGE_INFO,
      VIEW_COMMENT_MESSAGE_INFO,
    ],
    [MessageStatus.RECHAZADO]: [VIEW_MESSAGE_INFO, VIEW_MESSAGE_DECLINE],
  },
  [MessageUser.CC]: {
    [MessageStatus.PENDIENTE]: [VIEW_MESSAGE_INFO],
  },
  [MessageUser.RECEPTION]: {
    [MessageStatus.EN_ESPERA]: [
      VIEW_MESSAGE_INFO,
      VIEW_COMMENT_MESSAGE_INFO,
      INTERACT_IN_DECLINE_MESSAGE,
    ],
  },
};

export const TYPE_PROCEDURE = {
  comunication: {
    category: 'GLOBAL',
    title: 'Nuevo comunicado',
    addUsersText: '+ Destinatario',
    accessTo: 'comunicado',
    provied: 'mail',
    idSubmenu: 3,
    idName: 'messageId',
    previewPdf: 'seal-message',
    urlQuantity: '/mail/imbox/quantity',
  },
  regularProcedure: {
    category: 'DIRECT',
    title: 'Nuevo tramite Regular',
    accessTo: 'tramite-regular',
    provied: 'mail',
    addUsersText: '+Cc',
    idSubmenu: 2,
    idName: 'messageId',
    previewPdf: 'seal-message',
    urlQuantity: '/mail/imbox/quantity',
  },
  payProcedure: {
    category: 'NORMAL',
    provied: 'payMail',
    title: 'tramite-de-pago',
    accessTo: '',
    addUsersText: '+Cc',
    idSubmenu: 1,
    idName: 'paymessageId',
    previewPdf: 'seal-paymessage',
    urlQuantity: '/paymail/imbox/quantity',
  },
};
