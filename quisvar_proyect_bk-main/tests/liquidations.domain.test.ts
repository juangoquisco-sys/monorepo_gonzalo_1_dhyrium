import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateLiquidationNet,
  calculateTaskLiquidationAmount,
  summarizePreLiquidation,
} from '../src/modules/liquidations/liquidations.domain';
import {
  createLiquidationRequestSchema,
  preLiquidationStagesRequestSchema,
  reconcileLiquidationRequestSchema,
} from '../src/modules/liquidations/liquidations.schema';

test('resume una etapa pendiente, lista y con conformidad', () => {
  assert.deepEqual(
    summarizePreLiquidation([{ status: 'PROCESS' }, { status: 'REVIEWED' }]),
    {
      reviewedTasks: 1,
      doneTasks: 0,
      pendingTasks: 1,
      canGrantConformity: false,
      stageStatus: 'IN_PROGRESS',
    }
  );
  assert.equal(
    summarizePreLiquidation([{ status: 'REVIEWED' }, { status: 'DONE' }])
      .stageStatus,
    'READY_FOR_CONFORMITY'
  );
  assert.equal(
    summarizePreLiquidation([{ status: 'DONE' }, { status: 'DONE' }])
      .stageStatus,
    'CONFORMITY_GRANTED'
  );
});

test('calcula monto de tarea por precio o por tarifa mensual', () => {
  assert.deepEqual(
    calculateTaskLiquidationAmount({
      taskPrice: 330,
      days: 3,
      monthlyPrice: 3_000,
      participationPercentage: 25,
    }),
    { taskBaseAmount: 330, userGrossAmount: 82.5 }
  );
  assert.deepEqual(
    calculateTaskLiquidationAmount({
      taskPrice: 0,
      days: 3,
      monthlyPrice: 3_000,
      participationPercentage: 50,
    }),
    { taskBaseAmount: 300, userGrossAmount: 150 }
  );
});

test('calcula amortizacion y neto con redondeo monetario', () => {
  assert.deepEqual(calculateLiquidationNet(1_000, [100.1, 99.95]), {
    amortizedAmount: 200.05,
    netAmount: 799.95,
  });
});

test('valida y convierte filtros e identificadores de conciliacion', () => {
  const filters = preLiquidationStagesRequestSchema.parse({
    query: { projectId: '9', stageId: '32' },
  });
  assert.deepEqual(filters.query, { projectId: 9, stageId: 32 });

  const reconciliation = reconcileLiquidationRequestSchema.parse({
    params: { payrollId: '4' },
    body: { liquidationReportId: '7', advanceReportIds: ['2', 3] },
  });
  assert.deepEqual(reconciliation, {
    params: { payrollId: 4 },
    body: { liquidationReportId: 7, advanceReportIds: [2, 3] },
  });
});

test('rechaza JSON invalido y campos no declarados al crear solicitud', () => {
  assert.equal(
    createLiquidationRequestSchema.safeParse({ body: { data: '{' } }).success,
    false
  );
  assert.equal(
    createLiquidationRequestSchema.safeParse({
      body: {
        data: JSON.stringify({
          stageId: 32,
          title: 'Liquidacion',
          header: 'Liquidacion',
          description: '',
          isAuthorized: true,
        }),
      },
    }).success,
    false
  );
});
