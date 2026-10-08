import { z } from 'zod';

const nutritionSchema = z.object({
  servingLabel: z.string().trim().min(1).max(120),
  caloriesKcal: z.number().int().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(500),
  confidence: z.number().min(0).max(1),
  summaryEs: z.string().trim().max(500).optional(),
  summaryEn: z.string().trim().max(500).optional(),
});

export const importedDishSchema = z.object({
  rawName: z.string().trim().min(1).max(180),
  normalizedName: z.string().trim().min(1).max(180),
  nutrition: nutritionSchema,
});

export const importedMenuSchema = z.object({
  soup: importedDishSchema.nullable(),
  seconds: z.array(importedDishSchema).min(1).max(20),
  dessert: importedDishSchema.nullable(),
  refreshment: importedDishSchema.nullable(),
});

export const createLunchMenuImportProposalSchema = z.object({
  body: z.object({
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    durationMinutes: z.number().int().min(1).max(1440).default(30),
    originalText: z.string().trim().min(8).max(12_000),
  }).strict(),
});

export const proposalIdSchema = z.object({ params: z.object({ id: z.string().uuid() }).strict() });
export const updateLunchMenuImportProposalSchema = proposalIdSchema.extend({
  body: z.object({
    parsedMenu: importedMenuSchema,
    durationMinutes: z.number().int().min(1).max(1440),
  }).strict(),
});
