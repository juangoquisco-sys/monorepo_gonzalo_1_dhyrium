import { useState, type ReactNode } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import { Input } from '@/components/ui/input';
import type { DialogHandle } from '@/utils/dialog';
import {
  createLunchMenuImportProposal,
  publishLunchMenuImportProposal,
  updateLunchMenuImportProposal,
  type ImportedDish,
  type ImportedMenu,
  type LunchMenuImportProposal,
} from './lunchMenu.service';

type Props = { date: string; durationMinutes: number; isReplacing: boolean; currentVersion?: number; getDialogHandle: () => DialogHandle | null; onPublished: () => Promise<void> };
type DishEditorProps = { dish: ImportedDish; onChange: (dish: ImportedDish) => void };
type ApiError = { response?: { data?: { message?: unknown } } };

const toNumber = (value: string, fallback: number) => value === '' ? 0 : Number.isFinite(Number(value)) ? Number(value) : fallback;
const messageFromError = (error: unknown, fallback: string) => {
  const message = (error as ApiError).response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

function DishEditor({ dish, onChange }: DishEditorProps) {
  const nutrition = dish.nutrition;
  const updateNutrition = (field: keyof ImportedDish['nutrition'], value: string) => onChange({
    ...dish,
    nutrition: { ...nutrition, [field]: field === 'servingLabel' ? value : toNumber(value, nutrition[field] as number) },
  });
  const updateName = (value: string) => onChange({ ...dish, rawName: value, normalizedName: value });

  return <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
    <label className="block font-medium">Nombre del plato<Input className="mt-1" value={dish.rawName} onChange={event => updateName(event.target.value)} /></label>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label>Calorías<Input className="mt-1" type="number" min="0" value={nutrition.caloriesKcal} onChange={event => updateNutrition('caloriesKcal', event.target.value)} /></label>
      <label>Proteína (g)<Input className="mt-1" type="number" min="0" step="0.1" value={nutrition.proteinG} onChange={event => updateNutrition('proteinG', event.target.value)} /></label>
      <label>Carbohidratos (g)<Input className="mt-1" type="number" min="0" step="0.1" value={nutrition.carbsG} onChange={event => updateNutrition('carbsG', event.target.value)} /></label>
      <label>Grasa (g)<Input className="mt-1" type="number" min="0" step="0.1" value={nutrition.fatG} onChange={event => updateNutrition('fatG', event.target.value)} /></label>
    </div>
    <label className="block text-muted-foreground">Porción<Input className="mt-1" value={nutrition.servingLabel} onChange={event => updateNutrition('servingLabel', event.target.value)} /></label>
    <p className="text-xs text-amber-700">Estimado por IA — revísalo antes de usarlo como dato nutricional clínico.</p>
  </div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h3 className="text-sm font-semibold">{title}</h3>{children}</section>;
}

export default function LunchMenuImportDialog({ date, durationMinutes, isReplacing, currentVersion, getDialogHandle, onPublished }: Props) {
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState<LunchMenuImportProposal | null>(null);
  const [reviewMenu, setReviewMenu] = useState<ImportedMenu | null>(null);
  const [reviewDuration, setReviewDuration] = useState(durationMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interpret = async () => {
    setBusy(true); setError(null);
    try {
      const result = await createLunchMenuImportProposal({ serviceDate: date, durationMinutes, originalText: text });
      setProposal(result); setReviewMenu(result.parsedMenu); setReviewDuration(result.durationMinutes);
    } catch (error) { setError(messageFromError(error, 'No se pudo interpretar el texto. Puedes usar la carga manual.')); }
    finally { setBusy(false); }
  };
  const updateDish = (kind: 'soup' | 'dessert' | 'refreshment', dish: ImportedDish) => setReviewMenu(menu => menu ? { ...menu, [kind]: dish } : menu);
  const updateSecond = (index: number, dish: ImportedDish) => setReviewMenu(menu => menu ? { ...menu, seconds: menu.seconds.map((item, itemIndex) => itemIndex === index ? dish : item) } : menu);
  const saveReview = async () => {
    if (!proposal || !reviewMenu) return;
    const updated = await updateLunchMenuImportProposal(proposal.id, { parsedMenu: reviewMenu, durationMinutes: reviewDuration });
    setProposal(updated); setReviewMenu(updated.parsedMenu); setReviewDuration(updated.durationMinutes);
  };
  const persist = async () => {
    setBusy(true); setError(null);
    try { await saveReview(); } catch { setError('No se pudieron guardar los cambios.'); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!proposal || !reviewMenu) return;
    setBusy(true); setError(null);
    const dialog = getDialogHandle(); dialog?.block('Publicando menú revisado…');
    try { await saveReview(); await publishLunchMenuImportProposal(proposal.id); await onPublished(); dialog?.close(); }
    catch { setError('No se pudo guardar o publicar la propuesta. Revisa los campos e inténtalo otra vez.'); dialog?.unblock(); setBusy(false); }
  };

  if (!proposal || !reviewMenu) return <div className="space-y-4"><p className="text-sm text-muted-foreground">Pega solo el texto del restaurante. No incluyas nombres ni pedidos de empleados.</p>{isReplacing && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>Reemplazarás el menú actual{currentVersion ? ` (versión ${currentVersion})` : ''}.</strong><p className="mt-1">Al confirmar se publicará una nueva versión. Las elecciones existentes se conservan como historial y el personal deberá elegir en el nuevo menú.</p></div>}<textarea className="min-h-48 w-full rounded-md border border-input bg-background p-3 text-sm" value={text} onChange={event => setText(event.target.value)} placeholder={'Entrada: ...\nSopa: ...\nSegundos:\n- ...\nRefresco: ...'} />{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><AppButton variant="outline" onClick={() => getDialogHandle()?.close()}>Cancelar</AppButton><AppButton disabled={busy || text.trim().length < 8} onClick={() => void interpret()}>{busy ? 'Interpretando…' : 'Interpretar menú'}</AppButton></div></div>;

  return <div className="space-y-5"><div><p className="text-sm font-medium">Revisa y corrige la propuesta</p><p className="text-sm text-muted-foreground">Los cambios se guardan manualmente; no vuelven a procesar el texto con IA.</p></div>{isReplacing && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>Publicarás una nueva versión{currentVersion ? ` (versión ${currentVersion + 1})` : ''}.</strong><p className="mt-1">Las elecciones de la versión actual permanecen en historial. El nuevo menú quedará activo para nuevas elecciones.</p></div>}<div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">{reviewMenu.soup && <Section title="Sopa"><DishEditor dish={reviewMenu.soup} onChange={dish => updateDish('soup', dish)} /></Section>}<Section title="Segundos">{reviewMenu.seconds.map((dish, index) => <DishEditor key={`${dish.rawName}-${index}`} dish={dish} onChange={next => updateSecond(index, next)} />)}</Section>{reviewMenu.dessert && <Section title="Postre"><DishEditor dish={reviewMenu.dessert} onChange={dish => updateDish('dessert', dish)} /></Section>}{reviewMenu.refreshment && <Section title="Refresco"><DishEditor dish={reviewMenu.refreshment} onChange={dish => updateDish('refreshment', dish)} /></Section>}</div><section className="rounded-md border border-border p-3"><h3 className="text-sm font-semibold">Tiempo de elección</h3><p className="mt-1 text-sm text-muted-foreground">Define cuánto tiempo tendrán las personas para elegir antes de publicar.</p><label className="mt-3 block text-sm font-medium">Minutos<Input className="mt-1 max-w-36" type="number" min="1" max="1440" value={reviewDuration} onChange={event => setReviewDuration(toNumber(event.target.value, reviewDuration))} /></label></section>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><AppButton variant="outline" disabled={busy} onClick={() => getDialogHandle()?.close()}>Cancelar</AppButton><AppButton variant="outline" disabled={busy} onClick={() => void persist()}>{busy ? 'Guardando…' : 'Guardar cambios'}</AppButton><AppButton disabled={busy || reviewDuration < 1} onClick={() => void publish()}>{busy ? 'Publicando…' : isReplacing ? 'Confirmar y publicar nueva versión' : 'Confirmar, publicar y enviar'}</AppButton></div></div>;
}
