import SocketManager from '@/models/SocketManager';
import { prisma } from '@/utils/prisma.server';

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const TARGET_USER_ID = 2;
const APPROVER_DNI = '45574308';
const AUTOMATION_KEY = 'DIEGO_ROMANI_CLASES';

type AutomationDb = Pick<typeof prisma, 'users' | 'licenses'>;

type Logger = Pick<Console, 'error'>;

type LimaDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

const limaDateParts = (now: Date): LimaDateParts => {
  const lima = new Date(now.getTime() - LIMA_OFFSET_MS);
  return {
    year: lima.getUTCFullYear(),
    month: lima.getUTCMonth(),
    day: lima.getUTCDate(),
    weekday: lima.getUTCDay(),
  };
};

/**
 * Licenses persist Lima clock components as UTC values. The existing license
 * and gate-control helpers apply the five-hour offset when comparing and
 * presenting them.
 */
export const limaLicenseDate = (
  now: Date,
  hour: number,
  minute: number
) => {
  const { year, month, day } = limaDateParts(now);
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
};

export const isLimaWorkday = (now: Date) => {
  const { weekday } = limaDateParts(now);
  return weekday >= 1 && weekday <= 5;
};

export const clasesPermitWindow = (now: Date) => ({
  startDate: limaLicenseDate(now, 12, 45),
  untilDate: limaLicenseDate(now, 19, 30),
  dayStart: limaLicenseDate(now, 0, 0),
  nextDayStart: limaLicenseDate(now, 24, 0),
});

class ClasesPermitAutomationService {
  constructor(
    private readonly db: AutomationDb = prisma,
    private readonly logger: Logger = console
  ) {}

  private emitLicenseUpdate() {
    try {
      const io = SocketManager.getInstance();
      io.emit('server:license-update');
      io.emit('server:gate-control-update', {
        passId: 'license',
        action: 'LICENSE_CHANGED',
      });
      io.to(String(TARGET_USER_ID)).emit('server:gate-control-update', {
        passId: 'license',
        action: 'LICENSE_CHANGED',
      });
    } catch {
      // SocketManager can be unavailable while the server is starting or in tests.
    }
  }

  private async removeAutomatedPermits(before?: Date) {
    const result = await this.db.licenses.deleteMany({
      where: {
        automationKey: AUTOMATION_KEY,
        ...(before ? { untilDate: { lt: before } } : {}),
      },
    });
    if (result.count > 0) this.emitLicenseUpdate();
    return result.count;
  }

  private async targetUserIsActive() {
    const user = await this.db.users.findUnique({
      where: { id: TARGET_USER_ID },
      select: { status: true },
    });
    return user?.status === true;
  }

  private async findApproverId() {
    const approver = await this.db.users.findFirst({
      where: { profile: { is: { dni: APPROVER_DNI } } },
      select: { id: true },
    });
    return approver?.id;
  }

  private async ensureTodayPermit(now: Date) {
    const { startDate, untilDate, dayStart, nextDayStart } =
      clasesPermitWindow(now);
    const existing = await this.db.licenses.findFirst({
      where: {
        automationKey: AUTOMATION_KEY,
        usersId: TARGET_USER_ID,
        startDate: { gte: dayStart, lt: nextDayStart },
      },
      select: { id: true, checkout: true },
    });
    if (existing) return existing;

    const supervisorId = await this.findApproverId();
    if (!supervisorId) {
      this.logger.error(
        `[CLASES_PERMIT_AUTOMATION] No se encontro al aprobador DNI ${APPROVER_DNI}; no se creo el permiso.`
      );
      return null;
    }

    const created = await this.db.licenses.create({
      data: {
        usersId: TARGET_USER_ID,
        supervisorId,
        reason: 'Clases',
        type: 'PERMISO',
        status: 'ACEPTADO',
        startDate,
        untilDate,
        automationKey: AUTOMATION_KEY,
      },
      select: { id: true, checkout: true },
    });
    this.emitLicenseUpdate();
    return created;
  }

  private async markTodayReturn(now: Date) {
    const { untilDate, dayStart, nextDayStart } = clasesPermitWindow(now);
    const result = await this.db.licenses.updateMany({
      where: {
        automationKey: AUTOMATION_KEY,
        usersId: TARGET_USER_ID,
        startDate: { gte: dayStart, lt: nextDayStart },
        checkout: null,
      },
      data: {
        checkout: untilDate,
        fine: 'PUNTUAL',
        status: 'INACTIVO',
      },
    });
    if (result.count > 0) this.emitLicenseUpdate();
    return result.count;
  }

  /** Reconciles startup gaps and is safe to call from the scheduled jobs. */
  async reconcile(now = new Date()) {
    if (!(await this.targetUserIsActive())) {
      await this.removeAutomatedPermits();
      return { created: false, returned: false, removed: true };
    }

    const { dayStart, untilDate } = clasesPermitWindow(now);
    const removed = await this.removeAutomatedPermits(dayStart);
    if (!isLimaWorkday(now)) {
      return { created: false, returned: false, removed: removed > 0 };
    }

    const permit = await this.ensureTodayPermit(now);
    if (!permit) return { created: false, returned: false, removed: removed > 0 };

    const licenseNow = new Date(now.getTime() - LIMA_OFFSET_MS);
    const returned =
      licenseNow >= untilDate ? (await this.markTodayReturn(now)) > 0 : false;
    return {
      created: permit.checkout === null,
      returned,
      removed: removed > 0,
    };
  }

  async markReturnAtDueTime(now = new Date()) {
    if (!(await this.targetUserIsActive()) || !isLimaWorkday(now)) return 0;
    return this.markTodayReturn(now);
  }
}

export {
  APPROVER_DNI,
  AUTOMATION_KEY,
  TARGET_USER_ID,
  ClasesPermitAutomationService,
};

export default new ClasesPermitAutomationService();
