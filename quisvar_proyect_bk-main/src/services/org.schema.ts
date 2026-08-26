import { OrganizationalUnitType } from '@prisma/client';
import { z } from 'zod';

const nullableText = (max: number) =>
  z.preprocess(
    value => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional()
  );

const parentIdSchema = z.preprocess(
  value => (value === '' ? null : value),
  z.string().uuid('La unidad padre no es válida.').nullable().optional()
);

export const createOrganizationalUnitSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingrese el nombre de la unidad.').max(180),
    codemap: nullableText(50),
    type: z.nativeEnum(OrganizationalUnitType),
    parentId: parentIdSchema,
  })
  .strict();

export const updateOrganizationalUnitSchema = z
  .object({
    name: z.string().trim().min(2).max(180).optional(),
    codemap: nullableText(50),
    type: z.nativeEnum(OrganizationalUnitType).optional(),
    parentId: parentIdSchema,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(payload => Object.keys(payload).length > 0, {
    message: 'Ingrese al menos un cambio para la unidad.',
  });

export const moveOrganizationalUnitSchema = z
  .object({ parentId: parentIdSchema })
  .strict();

