export type RankingLineSource = 'SUB_TASK' | 'BASIC_TASK' | 'NON_TASK_ACTIVITY';

export interface RankingLineInput {
  sourceType: RankingLineSource;
  sourceId: string;
  sourceLabel: string;
  weightDays: number;
  approvalPct: number;
}

export interface RankingLineComputed extends RankingLineInput {
  contribution: number;
}

export interface UserRankingInput {
  userId: number;
  unitId: string | null;
  lines: RankingLineInput[];
}

export interface RankingEntryComputed {
  userId: number;
  unitId: string | null;
  score: number;
  totalWeightDays: number;
  avgApprovalPct: number;
  qualified: boolean;
  position: number;
  lines: RankingLineComputed[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export const computeLineContribution = (line: RankingLineInput): number =>
  round2(line.weightDays * (line.approvalPct / 100));

/**
 * Puntaje = sum(peso_dias * %aprobado) sobre las lineas (tareas tecnicas +
 * actividades administrativas aprobadas) de un usuario en el periodo.
 */
export const computeUserRankingEntry = (
  input: UserRankingInput,
  minWeightDaysToQualify: number
): Omit<RankingEntryComputed, 'position'> => {
  const lines = input.lines.map(line => ({
    ...line,
    contribution: computeLineContribution(line),
  }));
  const score = round2(lines.reduce((sum, line) => sum + line.contribution, 0));
  const totalWeightDays = round2(
    lines.reduce((sum, line) => sum + line.weightDays, 0)
  );
  const avgApprovalPct = totalWeightDays
    ? round2(
        lines.reduce((sum, line) => sum + line.weightDays * line.approvalPct, 0) /
          totalWeightDays
      )
    : 0;
  return {
    userId: input.userId,
    unitId: input.unitId,
    score,
    totalWeightDays,
    avgApprovalPct,
    qualified: totalWeightDays >= minWeightDaysToQualify,
    lines,
  };
};

/**
 * Ordena y asigna posicion (1-based) solo entre los usuarios que califican
 * (piso minimo de peso en dias). Los no calificados quedan sin posicion (0)
 * y no compiten por el top-N.
 */
export const rankEntries = (
  entries: Omit<RankingEntryComputed, 'position'>[]
): RankingEntryComputed[] => {
  const qualified = entries
    .filter(entry => entry.qualified)
    .sort((a, b) => b.score - a.score);
  const unqualified = entries.filter(entry => !entry.qualified);

  return [
    ...qualified.map((entry, index) => ({ ...entry, position: index + 1 })),
    ...unqualified.map(entry => ({ ...entry, position: 0 })),
  ];
};

export interface OfficeMembership {
  userId: number;
  unitId: string;
}

export interface OfficeExclusion {
  userId: number;
  unitId: string;
}

export interface RankingOfficeEntryComputed {
  unitId: string;
  totalScore: number;
  memberCount: number;
  scorePerMember: number;
  position: number;
}

const isExcluded = (
  exclusions: OfficeExclusion[],
  unitId: string,
  userId: number
) =>
  exclusions.some(
    exclusion => exclusion.unitId === unitId && exclusion.userId === userId
  );

/**
 * Un usuario con membership activo en varias oficinas suma su puntaje a
 * cada una. `scorePerMember` (totalScore / memberCount) es lo que se usa
 * para comparar oficinas entre si, para no favorecer a las mas numerosas.
 * Las exclusiones son por (oficina, usuario): un miembro puede seguir
 * contando en una oficina y estar excluido del calculo ponderado de otra.
 */
export const aggregateOfficeEntries = (
  entries: RankingEntryComputed[],
  memberships: OfficeMembership[],
  eligibleUnitIds: string[],
  exclusions: OfficeExclusion[] = []
): RankingOfficeEntryComputed[] => {
  const scoreByUser = new Map(entries.map(entry => [entry.userId, entry.score]));
  const eligible = new Set(eligibleUnitIds);

  const byUnit = new Map<string, { totalScore: number; memberCount: number }>();
  for (const membership of memberships) {
    if (!eligible.has(membership.unitId)) continue;
    if (isExcluded(exclusions, membership.unitId, membership.userId)) continue;
    const score = scoreByUser.get(membership.userId) ?? 0;
    const current = byUnit.get(membership.unitId) ?? {
      totalScore: 0,
      memberCount: 0,
    };
    current.totalScore = round2(current.totalScore + score);
    current.memberCount += 1;
    byUnit.set(membership.unitId, current);
  }

  const computed = Array.from(byUnit.entries()).map(([unitId, agg]) => ({
    unitId,
    totalScore: agg.totalScore,
    memberCount: agg.memberCount,
    scorePerMember: agg.memberCount ? round2(agg.totalScore / agg.memberCount) : 0,
  }));

  return computed
    .sort((a, b) => b.scorePerMember - a.scorePerMember)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
};
