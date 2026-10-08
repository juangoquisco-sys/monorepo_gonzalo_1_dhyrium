import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getLunchMenu, saveLunchMenuSelection } from './lunchMenu.service';

export default function LunchMenuSelectionCard({ date }: { date: string }) {
  const client = useQueryClient();
  const menuQuery = useQuery({
    queryKey: ['lunch-menu', date],
    queryFn: ({ signal }) => getLunchMenu(date, signal),
    retry: false,
  });
  const [secondId, setSecondId] = useState<number | null>(null);
  const [wantsSoup, setWantsSoup] = useState(false);
  const [wantsDessert, setWantsDessert] = useState(true);
  const [wantsRefreshment, setWantsRefreshment] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (menuQuery.data?.selection) {
      setSecondId(menuQuery.data.selection.lunchMenuSecondId);
      setWantsSoup(menuQuery.data.selection.wantsSoup);
      setWantsDessert(menuQuery.data.selection.wantsDessert);
      setWantsRefreshment(menuQuery.data.selection.wantsRefreshment);
      setIsEditing(false);
      return;
    }
    if (menuQuery.data) {
      setWantsSoup(false);
      setWantsDessert(menuQuery.data.dessertAvailable);
      setWantsRefreshment(menuQuery.data.refreshmentAvailable);
    }
  }, [menuQuery.data]);

  const save = useMutation({
    mutationFn: () => saveLunchMenuSelection(date, { lunchMenuSecondId: secondId!, wantsSoup, wantsDessert, wantsRefreshment }),
    onSuccess: async () => {
      SnackbarUtilities.success('Menú de almuerzo guardado');
      setIsEditing(false);
      await client.invalidateQueries({ queryKey: ['lunch-menu', date] });
    },
    onError: () => SnackbarUtilities.error('No se pudo guardar la elección'),
  });

  const remainingTime = useMemo(() => {
    const closesAt = menuQuery.data?.closesAt;
    if (!closesAt) return '00:00:00';
    const seconds = Math.max(0, Math.ceil((new Date(closesAt).getTime() - now) / 1_000));
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map(value => String(value).padStart(2, '0'))
      .join(':');
  }, [menuQuery.data?.closesAt, now]);
  const menu = menuQuery.data;
  if (menuQuery.isLoading || menuQuery.isError || !menu || !menu.isEligible) return null;
  const selectedSecond = menu.seconds.find(second => second.id === secondId)?.name;

  return (
    <Card className="mb-5 border-primary/40 bg-primary/5 shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base"><span className="flex items-center gap-2">Menú de almuerzo <Badge variant={menu.isOpen ? 'success' : 'outline'}>{menu.isOpen ? 'Abierto' : 'Cerrado'}</Badge></span><span className="rounded-md bg-background px-2 py-1 font-mono text-sm text-foreground">{menu.isOpen ? `Tiempo disponible ${remainingTime}` : 'Tiempo agotado'}</span></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {menu.selection && !isEditing ? <div className="rounded-md border border-success/40 bg-success-muted p-3"><p className="text-sm font-semibold text-success-foreground">Tu pedido está confirmado</p><dl className="mt-2 grid gap-1 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Segundo</dt><dd className="font-medium">{selectedSecond}</dd></div>{menu.soupAvailable && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{menu.soupName || 'Sopa'}</dt><dd className="font-medium">{wantsSoup ? 'Sí, deseo' : 'No deseo'}</dd></div>}{menu.dessertAvailable && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{menu.dessertName || 'Postre'}</dt><dd className="font-medium">{wantsDessert ? 'Sí, deseo' : 'No deseo'}</dd></div>}{menu.refreshmentAvailable && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{menu.refreshmentName || 'Refresco'}</dt><dd className="font-medium">{wantsRefreshment ? 'Sí, deseo' : 'No deseo'}</dd></div>}</dl></div> : null}
        {(!menu.selection || isEditing) && <fieldset disabled={!menu.isOpen || save.isPending} className="space-y-4">
          <div>
            <legend className="mb-2 text-lg font-semibold text-foreground">Elige tu segundo</legend>
            <div className="grid gap-2">
              {menu.seconds.map(second => <label key={second.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${secondId === second.id ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-background hover:bg-muted'}`}><input type="radio" name={`lunch-second-${date}`} checked={secondId === second.id} onChange={() => setSecondId(second.id)} />{second.name}</label>)}
            </div>
          </div>
          {menu.soupAvailable && <AccompanimentChoice label={menu.soupName || 'Sopa'} value={wantsSoup} onChange={setWantsSoup} date={date} kind="soup" />}
          {menu.dessertAvailable && <AccompanimentChoice label={menu.dessertName || 'Postre'} value={wantsDessert} onChange={setWantsDessert} date={date} kind="dessert" />}
          {menu.refreshmentAvailable && <AccompanimentChoice label={menu.refreshmentName || 'Refresco'} value={wantsRefreshment} onChange={setWantsRefreshment} date={date} kind="refreshment" />}
        </fieldset>}
        {menu.selection && !isEditing ? <Button type="button" variant="outline" disabled={!menu.isOpen} onClick={() => setIsEditing(true)}>Cambiar mi elección</Button> : <Button type="button" disabled={!menu.isOpen || !secondId || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Guardando...' : menu.selection ? 'Confirmar cambio' : 'Guardar elección'}</Button>}
      </CardContent>
    </Card>
  );
}

function AccompanimentChoice({
  label,
  value,
  onChange,
  date,
  kind,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  date: string;
  kind: string;
}) {
  return <div className="rounded-md border border-border bg-background p-3"><p className="mb-2 text-sm font-semibold text-foreground">¿Deseas {label.toLocaleLowerCase()}?</p><p className="mb-3 text-xs text-muted-foreground">Esta elección es independiente de tu segundo.</p><div className="grid grid-cols-2 gap-2"><label className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${value ? 'border-primary bg-primary/10 font-medium' : 'border-border'}`}><input type="radio" name={`lunch-${kind}-${date}`} checked={value} onChange={() => onChange(true)} />Sí, deseo</label><label className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${!value ? 'border-primary bg-primary/10 font-medium' : 'border-border'}`}><input type="radio" name={`lunch-${kind}-${date}`} checked={!value} onChange={() => onChange(false)} />No deseo</label></div></div>;
}
