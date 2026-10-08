import { FoodDishStatus, LunchMenuImportProposalStatus, NutritionSource, Prisma } from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import LunchMenuService from './lunchMenu.service';
import { importedMenuSchema, type importedDishSchema } from './lunchMenuNutrition.schema';
import type { z } from 'zod';

type ImportedDish = z.infer<typeof importedDishSchema>;
type ImportedMenu = z.infer<typeof importedMenuSchema>;

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const model = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_TIMEOUT_MS = 15_000;
type GeminiProvider = { key: string; model: string; name: 'primary' | 'fallback' };
type ParsedRestaurantMenu = { menu: ImportedMenu; model: string };

const providers = (): GeminiProvider[] => {
  const primaryKey = process.env.GEMINI_API_KEY;
  const fallbackKey = process.env.GEMINI_FALLBACK_API_KEY;
  const result: GeminiProvider[] = primaryKey ? [{ key: primaryKey, model: model(), name: 'primary' }] : [];
  if (fallbackKey) result.push({ key: fallbackKey, model: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite', name: 'fallback' });
  return result;
};

const nutritionResponseSchema = {
  type: 'OBJECT',
  properties: {
    servingLabel: { type: 'STRING' }, caloriesKcal: { type: 'INTEGER' },
    proteinG: { type: 'NUMBER' }, carbsG: { type: 'NUMBER' }, fatG: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' }, summaryEs: { type: 'STRING' }, summaryEn: { type: 'STRING' },
  },
  required: ['servingLabel', 'caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'confidence'],
};
const dishResponseSchema = {
  type: 'OBJECT', properties: { rawName: { type: 'STRING' }, normalizedName: { type: 'STRING' }, nutrition: nutritionResponseSchema },
  required: ['rawName', 'normalizedName', 'nutrition'],
};
const geminiSchema = {
  type: 'OBJECT', properties: {
    soup: { ...dishResponseSchema, nullable: true }, seconds: { type: 'ARRAY', items: dishResponseSchema },
    dessert: { ...dishResponseSchema, nullable: true }, refreshment: { ...dishResponseSchema, nullable: true },
  }, required: ['soup', 'seconds', 'dessert', 'refreshment'],
};

const wait = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

const unavailableMessage = (status?: number) => {
  if (status === 429) return 'Gemini alcanzó su límite temporal. Conserva el texto e inténtalo en unos minutos.';
  if (status === 503) return 'Gemini no está disponible temporalmente. Se reintentó automáticamente; conserva el texto e inténtalo nuevamente.';
  return 'No se pudo conectar con Gemini. Conserva el texto e inténtalo nuevamente.';
};

async function parseRestaurantText(originalText: string): Promise<ParsedRestaurantMenu> {
  const configuredProviders = providers();
  if (!configuredProviders.length) throw new AppError('La importación inteligente no está configurada. Usa la carga manual.', 503, 'GEMINI_NOT_CONFIGURED');
  const request = {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Extrae un menú peruano. Devuelve sopa, seconds, dessert y refreshment. Para cada plato calcula una estimación no clínica por porción estándar: rawName, normalizedName, servingLabel, caloriesKcal, proteinG, carbsG, fatG, confidence, summaryEs. Texto:\n${originalText}` }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema } }),
  };
  let lastStatus: number | undefined;

  for (const provider of configuredProviders) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${encodeURIComponent(provider.key)}`, { ...request, signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS) });
      if (response.ok) {
        try {
          const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new AppError('Gemini devolvió una respuesta vacía.', 422, 'GEMINI_INVALID_RESPONSE');
          return { menu: importedMenuSchema.parse(JSON.parse(text)), model: provider.model };
        } catch (error) {
          if (error instanceof AppError) throw error;
          console.warn('[lunch-menu] Gemini returned an invalid structured response', { error: error instanceof Error ? error.name : 'unknown', model: provider.model, provider: provider.name });
          throw new AppError('Gemini devolvió una propuesta con formato inválido. Conserva el texto e inténtalo nuevamente.', 422, 'GEMINI_INVALID_RESPONSE');
        }
      }

      lastStatus = response.status;
      console.warn('[lunch-menu] Gemini request rejected; trying next provider if configured', { status: response.status, model: provider.model, provider: provider.name });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.warn('[lunch-menu] Gemini request failed; trying next provider if configured', { error: error instanceof Error ? error.name : 'unknown', model: provider.model, provider: provider.name });
    }
    if (provider.name === 'primary' && configuredProviders.length > 1) await wait(500);
  }

  throw new AppError(unavailableMessage(lastStatus), 503, lastStatus === 429 ? 'GEMINI_RATE_LIMITED' : 'GEMINI_UNAVAILABLE');
}

const snapshot = (dish: ImportedDish) => ({ ...dish.nutrition, estimated: true, macroEnergyPercent: {
  protein: Math.round((dish.nutrition.proteinG * 4 / Math.max(1, dish.nutrition.caloriesKcal)) * 100),
  carbs: Math.round((dish.nutrition.carbsG * 4 / Math.max(1, dish.nutrition.caloriesKcal)) * 100),
  fat: Math.round((dish.nutrition.fatG * 9 / Math.max(1, dish.nutrition.caloriesKcal)) * 100),
} });

async function materializeDish(dish: ImportedDish) {
  const normalizedName = normalize(dish.normalizedName);
  const existing = await prisma.foodDish.findFirst({ where: { OR: [{ normalizedName }, { aliases: { some: { normalizedValue: normalizedName } } }] }, include: { nutrition: true } });
  if (existing) return { id: existing.id, nutritionSnapshot: existing.nutrition ? { ...existing.nutrition, estimated: existing.status !== FoodDishStatus.VERIFIED } : snapshot(dish) };
  const created = await prisma.foodDish.create({ data: { canonicalName: dish.normalizedName, normalizedName, status: FoodDishStatus.PENDING_REVIEW, aliases: { create: { value: dish.rawName, normalizedValue: normalize(dish.rawName) } }, nutrition: { create: { ...dish.nutrition, source: NutritionSource.GEMINI_ESTIMATE } } }, include: { nutrition: true } });
  return { id: created.id, nutritionSnapshot: snapshot(dish) };
}

class LunchMenuNutritionService {
  static async createProposal(input: { originalText: string; serviceDate: Date; durationMinutes: number; createdById: number }) {
    const parsed = await parseRestaurantText(input.originalText);
    return prisma.lunchMenuImportProposal.create({ data: { ...input, parsedMenu: parsed.menu as Prisma.InputJsonValue, model: parsed.model } });
  }
  static async getProposal(id: string) { const proposal = await prisma.lunchMenuImportProposal.findUnique({ where: { id } }); if (!proposal) throw new AppError('Propuesta no encontrada.', 404); return proposal; }
  static async updateProposal(id: string, input: { parsedMenu: ImportedMenu; durationMinutes: number }) {
    await this.getProposal(id);
    return prisma.lunchMenuImportProposal.update({
      where: { id },
      data: {
        parsedMenu: input.parsedMenu as Prisma.InputJsonValue,
        durationMinutes: input.durationMinutes,
        status: LunchMenuImportProposalStatus.REVIEWED,
        reviewedAt: new Date(),
      },
    });
  }
  static async publishProposal(id: string, actorId: number) {
    const proposal = await this.getProposal(id);
    if (proposal.status === LunchMenuImportProposalStatus.PUBLISHED) throw new AppError('La propuesta ya fue publicada.', 409);
    const parsed = importedMenuSchema.parse(proposal.parsedMenu);
    const seconds = await Promise.all(parsed.seconds.map(materializeDish));
    const soup = parsed.soup ? await materializeDish(parsed.soup) : null;
    const dessert = parsed.dessert ? await materializeDish(parsed.dessert) : null;
    const refreshment = parsed.refreshment ? await materializeDish(parsed.refreshment) : null;
    const menu = await LunchMenuService.publish({ serviceDate: proposal.serviceDate, seconds: parsed.seconds.map(item => item.rawName), soupAvailable: !!parsed.soup, soupName: parsed.soup?.rawName, dessertAvailable: !!parsed.dessert, dessertName: parsed.dessert?.rawName, refreshmentName: parsed.refreshment?.rawName, durationMinutes: proposal.durationMinutes, createdById: actorId });
    const version = menu.versions.find(item => item.version === menu.activeVersion);
    if (!version || version.seconds.length !== seconds.length) {
      throw new AppError('No se pudo identificar la versión recién publicada del menú.', 500, 'LUNCH_MENU_VERSION_INVALID');
    }
    await prisma.$transaction([
      ...seconds.map((item, position) => prisma.lunchMenuSecond.update({ where: { id: version.seconds[position].id }, data: { foodDishId: item.id, nutritionSnapshot: item.nutritionSnapshot as Prisma.InputJsonValue } })),
      prisma.lunchMenuVersion.update({ where: { id: version.id }, data: { soupFoodDishId: soup?.id, soupNutritionSnapshot: soup?.nutritionSnapshot as Prisma.InputJsonValue | undefined, dessertFoodDishId: dessert?.id, dessertNutritionSnapshot: dessert?.nutritionSnapshot as Prisma.InputJsonValue | undefined, refreshmentFoodDishId: refreshment?.id, refreshmentNutritionSnapshot: refreshment?.nutritionSnapshot as Prisma.InputJsonValue | undefined } }),
      prisma.lunchMenuImportProposal.update({ where: { id }, data: { status: LunchMenuImportProposalStatus.PUBLISHED, publishedAt: new Date() } }),
    ]);
    return menu;
  }
}
export default LunchMenuNutritionService;
