import { PayMessageStatus, Prisma } from '@prisma/client';
import Queries from '@/utils/queries';

interface IIncludeById {
  officeId: number | string;
  isAuthorizedGrop: boolean;
  paymentGroup: {
    not: null;
  } | null;
  paymessageStatus: PayMessageStatus;
}

class PayrollQueries {
  static includeById(options?: Partial<IIncludeById>) {
    const legacyOfficeId =
      typeof options?.officeId === 'number'
        ? options.officeId
        : Number.isFinite(Number(options?.officeId))
        ? Number(options?.officeId)
        : undefined;
    const query = Prisma.validator<Prisma.PayrollsInclude>()({
      reports: {
        where: {
          officeId: legacyOfficeId,
          isAuthorizedGrop: options?.isAuthorizedGrop,
          paymentGroup: options?.paymentGroup,
          paymessage: options?.paymessageStatus
            ? { status: options.paymessageStatus }
            : undefined,
        },
        include: {
          office: { select: { id: true, name: true } },
          paymessage: {
            select: {
              id: true,
              office: true,
              beforeOffice: true,
              status: true,
              title: true,
              header: true,
              users: {
                where: { userInit: true },
                select: {
                  user: {
                    select: {
                      ...Queries.selectProfileUser.select,
                      payrollInfo: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: [
          { officeId: 'asc' },
          { paymentGroupDate: 'desc' },
          { id: 'asc' },
        ],
      },
    });
    return query;
  }
}
export default PayrollQueries;
