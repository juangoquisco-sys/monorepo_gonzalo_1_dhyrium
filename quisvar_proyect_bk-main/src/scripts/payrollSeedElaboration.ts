import '@/config/env';
import PayrollMonthlyBridgeServices from '@/services/payrollMonthlyBridge.services';
import { prisma } from '@/utils/prisma.server';

const args = process.argv
  .slice(2)
  .reduce<Record<string, string>>((acc, arg) => {
    const [key, value = ''] = arg.replace(/^--/, '').split('=');
    acc[key] = value;
    return acc;
  }, {});

const required = (key: string) => {
  const value = args[key];
  if (!value) throw new Error(`Falta --${key}`);
  return value;
};

const toLimaBoundary = (date: string, edge: 'start' | 'end') => {
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  return new Date(`${date}T${time}-05:00`);
};

type CandidateTask = {
  price?: number;
  subTaskOnUserId: number;
};

type CandidateLevel = {
  tasks: CandidateTask[];
};

type CandidateStage = {
  levels: CandidateLevel[];
};

const main = async () => {
  const payrollId = Number(required('payrollId'));
  const from = required('from');
  const to = required('to');
  const defaultAmount = Number(args.defaultAmount || 1);

  if (!Number.isFinite(payrollId) || payrollId <= 0) {
    throw new Error('payrollId invalido');
  }
  if (!Number.isFinite(defaultAmount) || defaultAmount <= 0) {
    throw new Error('defaultAmount debe ser mayor a 0');
  }

  const candidates = await PayrollMonthlyBridgeServices.candidates({
    uploadStart: toLimaBoundary(from, 'start'),
    uploadEnd: toLimaBoundary(to, 'end'),
    status: 'ALL',
  });

  const items = candidates.users
    .map(user => {
      const tasks = (user.stages as CandidateStage[]).flatMap(stage =>
        stage.levels.flatMap(level => level.tasks)
      );
      const amount = tasks.reduce(
        (total: number, task: CandidateTask) => total + Number(task.price || 0),
        0
      );
      return {
        userId: user.id,
        amount: amount > 0 ? Number(amount.toFixed(2)) : defaultAmount,
        subTaskOnUserIds: tasks.map(
          (task: CandidateTask) => task.subTaskOnUserId
        ),
      };
    })
    .filter(item => item.subTaskOnUserIds.length);

  if (!items.length) {
    console.log('No hay tareas candidatas para crear informes.');
    return;
  }

  const result = await PayrollMonthlyBridgeServices.create({
    payrollId,
    periodStart: toLimaBoundary(from, 'start'),
    periodEnd: toLimaBoundary(to, 'end'),
    items,
  });

  console.log(
    `Informes creados: ${result.created.length}. Planilla: ${result.payrollId}`
  );
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
