import '@/config/env';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OrganizationalMembershipRole,
  OrganizationalUnitType,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

type SourceRow = {
  line: number;
  code: string;
  title: string;
  fullName: string;
  dni: string;
};

type ImportPlan = {
  units: SourceRow[];
  memberships: Array<
    SourceRow & {
      userId: number;
      unitCode: string;
      role: OrganizationalMembershipRole;
      isUnitLead: boolean;
    }
  >;
  skipped: Array<{ line: number; code: string; reason: string }>;
};

const codePattern = /^\d{2}(?:\.\d{2}){4}$/;

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-PE');

const cleanValue = (value: string) => value.replace(/^"|"$/g, '').trim();

/** Minimal TSV parser that preserves quoted cells and line provenance. */
export function parseOrganizationalTsv(input: string): SourceRow[] {
  const rows: SourceRow[] = [];
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || /^TOTAL\b/i.test(line.trim())) continue;
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let position = 0; position < line.length; position += 1) {
      const character = line[position];
      if (character === '"') {
        quoted = !quoted;
      } else if (character === '\t' && !quoted) {
        cells.push(cleanValue(cell));
        cell = '';
      } else {
        cell += character;
      }
    }
    cells.push(cleanValue(cell));
    const [code = '', title = '', fullName = '', dni = ''] = cells;
    if (!codePattern.test(code.trim())) continue;
    rows.push({
      line: index + 1,
      code: code.trim(),
      title: title.trim(),
      fullName: fullName.replace(/\s+/g, ' ').trim(),
      dni: dni.replace(/\D/g, ''),
    });
  }
  return rows;
}

export function parentCode(code: string): string | null {
  const parts = code.split('.');
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index] !== '00') {
      parts[index] = '00';
      return parts.join('.');
    }
  }
  return null;
}

function isStructuralUnit(row: SourceRow) {
  return !row.dni && /\.00\.00$/.test(row.code);
}

export function unitType(title: string): OrganizationalUnitType {
  const normalized = normalizeText(title);
  if (normalized.includes('GERENCIA')) return OrganizationalUnitType.GERENCIA;
  if (normalized.includes('OFICINA')) return OrganizationalUnitType.OFICINA;
  if (normalized.includes('COORDINACION')) return OrganizationalUnitType.COORDINACION;
  if (normalized.includes('UNIDAD')) return OrganizationalUnitType.ESPECIALIDAD;
  return OrganizationalUnitType.GRUPO;
}

export function roleForTitle(title: string): OrganizationalMembershipRole {
  const normalized = normalizeText(title);
  if (normalized.includes('GERENTE')) return OrganizationalMembershipRole.GERENTE;
  if (normalized.includes('JEFE')) return OrganizationalMembershipRole.JEFE;
  if (normalized.includes('COORDINADOR'))
    return OrganizationalMembershipRole.COORDINADOR;
  if (normalized.includes('ASISTENTE')) return OrganizationalMembershipRole.ASISTENTE;
  if (normalized.includes('TECNICO')) return OrganizationalMembershipRole.APOYO;
  return OrganizationalMembershipRole.ESPECIALISTA;
}

function isUnitLead(title: string) {
  const normalized = normalizeText(title);
  return normalized.includes('GERENTE') || normalized.includes('JEFE');
}

function assertDevelopmentDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL no está configurada');
  const host = new URL(databaseUrl).hostname.toLowerCase();
  const allowedHosts = new Set(['localhost', '127.0.0.1', 'dhyrium_db_local']);
  if (!allowedHosts.has(host) || host === '172.16.10.250') {
    throw new Error(
      'Importación bloqueada: esta herramienta solo puede operar contra la base local de desarrollo.'
    );
  }
}

export async function buildImportPlan(rows: SourceRow[]): Promise<ImportPlan> {
  const byCode = new Map<string, SourceRow[]>();
  const namesByDni = new Map<string, Set<string>>();
  const dnisByName = new Map<string, Set<string>>();
  rows.forEach(row => {
    const sameCode = byCode.get(row.code) ?? [];
    sameCode.push(row);
    byCode.set(row.code, sameCode);
    if (row.dni && row.fullName) {
      const names = namesByDni.get(row.dni) ?? new Set<string>();
      names.add(normalizeText(row.fullName));
      namesByDni.set(row.dni, names);
      const dnis = dnisByName.get(normalizeText(row.fullName)) ?? new Set<string>();
      dnis.add(row.dni);
      dnisByName.set(normalizeText(row.fullName), dnis);
    }
  });

  const duplicateCodes = new Set(
    [...byCode.entries()]
      .filter(([, items]) => items.length > 1)
      .map(([code]) => code)
  );
  const sourceCodes = new Set(rows.map(row => row.code));
  const sourceUnits = rows.filter(isStructuralUnit);
  const eligibleUnits = sourceUnits.filter(row => !duplicateCodes.has(row.code));
  const eligibleCodes = new Set(eligibleUnits.map(row => row.code));
  const allDnis = [...new Set(rows.map(row => row.dni).filter(Boolean))];
  const users = await prisma.users.findMany({
    where: { profile: { dni: { in: allDnis } } },
    select: { id: true, status: true, profile: { select: { dni: true } } },
  });
  const usersByDni = new Map<string, typeof users>();
  users.forEach(user => {
    const dni = user.profile?.dni?.replace(/\D/g, '');
    if (!dni) return;
    const sameDni = usersByDni.get(dni) ?? [];
    sameDni.push(user);
    usersByDni.set(dni, sameDni);
  });

  const skipped: ImportPlan['skipped'] = [];
  const units = eligibleUnits.filter(row => {
    const parent = parentCode(row.code);
    if (parent && sourceCodes.has(parent) && !eligibleCodes.has(parent)) {
      skipped.push({ line: row.line, code: row.code, reason: 'Unidad padre ambigua o inexistente en el archivo' });
      return false;
    }
    return true;
  });
  const createdUnitCodes = new Set(units.map(row => row.code));

  const memberships: ImportPlan['memberships'] = [];
  rows.filter(row => row.dni).forEach(row => {
    if (duplicateCodes.has(row.code)) {
      skipped.push({ line: row.line, code: row.code, reason: 'Código organizacional duplicado en el archivo' });
      return;
    }
    if ((namesByDni.get(row.dni)?.size ?? 0) > 1) {
      skipped.push({ line: row.line, code: row.code, reason: 'DNI asociado a nombres distintos' });
      return;
    }
    if ((dnisByName.get(normalizeText(row.fullName))?.size ?? 0) > 1) {
      skipped.push({ line: row.line, code: row.code, reason: 'Persona asociada a más de un DNI' });
      return;
    }
    const matches = usersByDni.get(row.dni) ?? [];
    if (matches.length !== 1 || !matches[0].status) {
      skipped.push({ line: row.line, code: row.code, reason: matches.length ? 'Perfil inactivo o DNI no único' : 'DNI no existe en desarrollo' });
      return;
    }
    const unitCode = parentCode(row.code);
    if (!unitCode || !createdUnitCodes.has(unitCode)) {
      skipped.push({ line: row.line, code: row.code, reason: 'Unidad de destino ambigua o no importable' });
      return;
    }
    memberships.push({
      ...row,
      userId: matches[0].id,
      unitCode,
      role: roleForTitle(row.title),
      isUnitLead: isUnitLead(row.title),
    });
  });

  return { units, memberships, skipped };
}

async function execute(plan: ImportPlan, apply: boolean) {
  const existingUnits = await prisma.organizationalUnit.findMany({
    where: { codemap: { in: plan.units.map(unit => unit.code) } },
    select: { id: true, codemap: true },
  });
  const existingByCode = new Map(
    existingUnits.flatMap(unit => (unit.codemap ? [[unit.codemap, unit.id] as const] : []))
  );
  const newUnits = plan.units.filter(unit => !existingByCode.has(unit.code));
  const membershipCandidates = plan.memberships;
  const alreadyExisting = await prisma.organizationalMembership.findMany({
    where: {
      userId: { in: membershipCandidates.map(member => member.userId) },
      endDate: null,
      positionTitle: { in: membershipCandidates.map(member => member.title) },
    },
    include: { unit: { select: { codemap: true } } },
  });
  const existingMembershipKeys = new Set(
    alreadyExisting.map(member => `${member.userId}:${member.unit.codemap}:${member.positionTitle}`)
  );
  const newMemberships = membershipCandidates.filter(
    member => !existingMembershipKeys.has(`${member.userId}:${member.unitCode}:${member.title}`)
  );

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    units: { existing: existingUnits.length, create: newUnits.length },
    memberships: { existing: membershipCandidates.length - newMemberships.length, create: newMemberships.length },
    skipped: plan.skipped,
  };
  if (!apply) return summary;

  await prisma.$transaction(async tx => {
    const unitIdByCode = new Map(existingByCode);
    for (const unit of plan.units) {
      let id = unitIdByCode.get(unit.code);
      if (!id) {
        const parent = parentCode(unit.code);
        const created = await tx.organizationalUnit.create({
          data: {
            name: unit.title,
            codemap: unit.code,
            type: unitType(unit.title),
            parentId: parent ? unitIdByCode.get(parent) ?? null : null,
          },
          select: { id: true },
        });
        id = created.id;
        unitIdByCode.set(unit.code, id);
      }
    }
    for (const member of newMemberships) {
      const unitId = unitIdByCode.get(member.unitCode);
      if (!unitId) throw new Error(`Unidad no resuelta: ${member.unitCode}`);
      await tx.organizationalMembership.create({
        data: {
          userId: member.userId,
          unitId,
          role: member.role,
          positionTitle: member.title,
          isPrimary: false,
          isUnitLead: member.isUnitLead,
          canManageUnitProjects: false,
          startDate: new Date(),
        },
      });
    }
  });
  return summary;
}

async function main() {
  assertDevelopmentDatabase();
  const fileIndex = process.argv.indexOf('--file');
  const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : undefined;
  if (!file) throw new Error('Use --file <ruta-al-TSV>');
  const apply = process.argv.includes('--apply');
  const rows = parseOrganizationalTsv(readFileSync(resolve(file), 'utf8'));
  const plan = await buildImportPlan(rows);
  console.log(JSON.stringify(await execute(plan, apply), null, 2));
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
