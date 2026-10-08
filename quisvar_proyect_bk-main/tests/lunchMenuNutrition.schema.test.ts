import assert from 'node:assert/strict';
import test from 'node:test';
import { createLunchMenuImportProposalSchema, importedMenuSchema, updateLunchMenuImportProposalSchema } from '../src/modules/lunch-menu/lunchMenuNutrition.schema';

const dish = { rawName: 'Pollo al horno', normalizedName: 'pollo al horno', nutrition: { servingLabel: '1 plato', caloriesKcal: 620, proteinG: 42, carbsG: 55, fatG: 24, confidence: 0.72 } };

test('accepts a reviewable nutrition import proposal', () => {
  const parsed = createLunchMenuImportProposalSchema.parse({ body: { serviceDate: '2026-10-06', durationMinutes: 30, originalText: 'Sopa: aguadito. Segundo: pollo al horno.' } });
  assert.equal(parsed.body.durationMinutes, 30);
  assert.equal(importedMenuSchema.parse({ soup: dish, seconds: [dish], dessert: null, refreshment: null }).seconds.length, 1);
});

test('rejects unsafe nutrition values and incomplete restaurant text', () => {
  assert.throws(() => createLunchMenuImportProposalSchema.parse({ body: { serviceDate: '2026-10-06', originalText: 'corto' } }));
  assert.throws(() => importedMenuSchema.parse({ soup: null, seconds: [{ ...dish, nutrition: { ...dish.nutrition, caloriesKcal: -1 } }], dessert: null, refreshment: null }));
});

test('accepts a manual review with its chosen duration', () => {
  const parsed = updateLunchMenuImportProposalSchema.parse({
    params: { id: '00000000-0000-4000-8000-000000000001' },
    body: { parsedMenu: { soup: dish, seconds: [dish], dessert: null, refreshment: null }, durationMinutes: 45 },
  });
  assert.equal(parsed.body.durationMinutes, 45);
  assert.equal(parsed.body.parsedMenu.soup?.rawName, 'Pollo al horno');
});
