import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { openDialog, type DialogHandle } from '@/utils/dialog';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import LunchMenuAutoAssignDialog, { type LunchMenuAutoAssignmentPreview } from './LunchMenuAutoAssignDialog';
import { assignLunchMenuSelection, assignMostRequestedLunchMenuSelections, closeLunchMenu, getLunchMenuModeration, previewMostRequestedLunchMenuSelections, publishLunchMenu, reopenLunchMenu } from './lunchMenu.service';

export default function LunchMenuModerationPanel({ date }: { date: string }) {
  const client = useQueryClient(); const query = useQuery({ queryKey: ['lunch-menu-moderation', date], queryFn: ({ signal }) => getLunchMenuModeration(date, signal), retry: false });
  const [secondsText, setSecondsText] = useState(''); const [duration, setDuration] = useState(30); const [soup, setSoup] = useState(true); const [soupName, setSoupName] = useState(''); const [dessertAvailable, setDessertAvailable] = useState(true); const [dessertName, setDessertName] = useState(''); const [refreshmentName, setRefreshmentName] = useState(''); const [choices, setChoices] = useState<Record<number, number>>({}); const [accompanimentChoices, setAccompanimentChoices] = useState<Record<number, { wantsSoup: boolean; wantsDessert: boolean; wantsRefreshment: boolean }>>({}); const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ['lunch-menu-moderation', date] });
  const publish = useMutation({ mutationFn: () => publishLunchMenu({ serviceDate: date, seconds: secondsText.split('\n').map(x => x.trim()).filter(Boolean), soupAvailable: soup, soupName, dessertAvailable, dessertName, refreshmentName, durationMinutes: duration }), onSuccess: () => { SnackbarUtilities.success('Menú publicado'); refresh(); }, onError: () => SnackbarUtilities.error('No se pudo publicar el menú') });
  const toggle = useMutation({ mutationFn: () => query.data?.isOpen ? closeLunchMenu(date) : reopenLunchMenu(date, duration), onSuccess: () => { SnackbarUtilities.success('Estado del menú actualizado'); refresh(); } });
  const assign = useMutation({ mutationFn: ({ userId, secondId, accompaniment }: { userId: number; secondId: number; accompaniment: { wantsSoup: boolean; wantsDessert: boolean; wantsRefreshment: boolean } }) => assignLunchMenuSelection(date, userId, { lunchMenuSecondId: secondId, ...accompaniment }), onSuccess: () => { SnackbarUtilities.success('Pedido ajustado'); refresh(); }, onError: () => SnackbarUtilities.error('No tiene autorización para ajustar esta elección') });
  const assignMostRequested = useMutation({ mutationFn: (assignments: Array<{ userId: number; wantsSoup: boolean; wantsDessert: boolean; wantsRefreshment: boolean }>) => assignMostRequestedLunchMenuSelections(date, assignments), onSuccess: (result: { assigned: number; secondName: string }) => { SnackbarUtilities.success(`${result.assigned} pendientes asignados a ${result.secondName}`); refresh(); }, onError: () => SnackbarUtilities.error('No se pudo asignar el segundo más solicitado') });
  const data = query.data;
  const hasMenu = !!data && 'users' in data;
  const defaultAccompaniment = { wantsSoup: false, wantsDessert: hasMenu && data.dessertAvailable, wantsRefreshment: hasMenu && data.refreshmentAvailable };
  const getAccompaniment = (userId: number, fallback = defaultAccompaniment) => accompanimentChoices[userId] ?? fallback;
  const automaticUsers = hasMenu ? data.users.filter(user => user.selection?.source === 'AUTO') : [];
  const openAutomaticAssignmentConfirmation = async () => {
    try {
      setIsLoadingPreview(true);
      const preview = await previewMostRequestedLunchMenuSelections(date) as LunchMenuAutoAssignmentPreview;
      let dialogHandle: DialogHandle | null = null;
      dialogHandle = openDialog({ title: 'Confirmar asignación automática', description: 'Revisa los pedidos antes de aplicarlos.', width: 'min(92vw, 720px)', children: <LunchMenuAutoAssignDialog preview={preview} soupAvailable={data?.soupAvailable ?? false} dessertAvailable={data?.dessertAvailable ?? false} refreshmentAvailable={data?.refreshmentAvailable ?? false} soupLabel={data?.soupName || 'Sopa'} dessertLabel={data?.dessertName || 'Postre'} refreshmentLabel={data?.refreshmentName || 'Refresco'} getDialogHandle={() => dialogHandle} onConfirm={assignments => assignMostRequested.mutateAsync(assignments).then(() => undefined)} /> });
    } catch {
      SnackbarUtilities.error('No se pudo preparar la propuesta de asignación');
    } finally {
      setIsLoadingPreview(false);
    }
  };
  const pendingUsers = hasMenu ? data.users.filter(user => !user.selection) : [];
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  const remainingClock = useMemo(() => {
    if (!hasMenu) return '00:00:00';
    const total = Math.max(0, Math.ceil((new Date(data.closesAt).getTime() - now) / 1_000));
    return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map(value => String(value).padStart(2, '0')).join(':');
  }, [data, hasMenu, now]);
  const lunchMenuUrl = hasMenu
    ? `${window.location.origin}/#/cocina/formulario?date=${data.serviceDate}`
    : '';
  const groupAnnouncement = hasMenu
    ? [
      `*Menú de almuerzo publicado — ${data.serviceDate}*`,
      'Segundos disponibles:',
      ...data.seconds.map(second => `• ${second.name}`),
      '',
      `Acompañamientos: ${[data.soupAvailable ? `Sopa: ${data.soupName || 'Sopa'}` : null, data.dessertAvailable ? `Postre: ${data.dessertName || 'Postre'}` : null, data.refreshmentAvailable ? `Refresco: ${data.refreshmentName || 'Refresco'}` : null].filter(Boolean).join(' · ') || 'No disponibles'}`,
      `Elige tu segundo y confirma los acompañamientos que deseas hasta las ${new Date(data.closesAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}.`,
      '',
      `Ingresa aquí: ${lunchMenuUrl}`,
    ].join('\n')
    : '';
  const copyGroupAnnouncement = async () => {
    try {
      await copyTextToClipboard(groupAnnouncement);
      SnackbarUtilities.success('Aviso para el grupo copiado para WhatsApp');
    } catch {
      SnackbarUtilities.error('No se pudo copiar el aviso para el grupo');
    }
  };
  const shareGroupAnnouncement = () => {
    const popup = window.open(`https://wa.me/?text=${encodeURIComponent(groupAnnouncement)}`, '_blank', 'noopener,noreferrer');
    if (!popup) SnackbarUtilities.error('El navegador bloqueó la ventana de WhatsApp');
  };

  return (
    <section className="mt-3 rounded-lg border border-border bg-card p-5 text-sm shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong className="text-base">Administrar menú de almuerzo</strong>
          <p className="text-muted-foreground">Publica los segundos y define el tiempo de elección.</p>
        </div>
        {hasMenu && <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate()}>{data.isOpen ? 'Cerrar menú' : 'Reabrir menú'}</Button>}
      </div>
      {hasMenu && <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${data.isOpen ? 'border-success/30 bg-success-muted' : 'border-border bg-muted/50'}`}><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Menú publicado</p><strong className="text-sm">{data.isOpen ? 'Recibiendo respuestas' : 'Periodo de elección cerrado'}</strong><p className="mt-1 text-xs text-muted-foreground">{[data.soupAvailable ? `Sopa: ${data.soupName || 'Sopa'}` : null, data.dessertAvailable ? `Postre: ${data.dessertName || 'Postre'}` : null, data.refreshmentAvailable ? `Refresco: ${data.refreshmentName || 'Refresco'}` : null].filter(Boolean).join(' · ')}</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={shareGroupAnnouncement}>Compartir aviso</Button><Button size="sm" variant="outline" onClick={() => void copyGroupAnnouncement()}>Copiar aviso</Button><div className="rounded-md bg-background px-3 py-2 text-right"><span className="block text-xs text-muted-foreground">{data.isOpen ? 'Tiempo restante' : 'Cierre'}</span><strong className="font-mono text-base">{data.isOpen ? remainingClock : 'Finalizado'}</strong></div></div></div>}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
        <label className="grid gap-1 font-medium">Segundos<textarea className="min-h-28 rounded-md border border-input bg-background p-3 font-normal" value={secondsText} onChange={event => setSecondsText(event.target.value)} placeholder={'Un segundo por línea\nEj.: Pollo al horno\nEj.: Lomo saltado'} /></label>
        <label className="grid gap-1 font-medium">Minutos<Input type="number" min="1" max="1440" value={duration} onChange={event => setDuration(Number(event.target.value))} /></label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3"><div className="rounded-md border border-border p-3"><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={soup} onChange={event => setSoup(event.target.checked)} />Ofrecer sopa</label><Input className="mt-2" disabled={!soup} value={soupName} onChange={event => setSoupName(event.target.value)} placeholder="Nombre opcional, ej.: Quinua" /></div><div className="rounded-md border border-border p-3"><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={dessertAvailable} onChange={event => setDessertAvailable(event.target.checked)} />Ofrecer postre</label><Input className="mt-2" disabled={!dessertAvailable} value={dessertName} onChange={event => setDessertName(event.target.value)} placeholder="Nombre opcional, ej.: Mazamorra" /></div><div className="rounded-md border border-border p-3"><strong>Refresco</strong><p className="mt-1 text-xs text-muted-foreground">Siempre se ofrece. El nombre es opcional.</p><Input className="mt-2" value={refreshmentName} onChange={event => setRefreshmentName(event.target.value)} placeholder="Ej.: Maracuyá" /></div></div>
      <Button className="mt-4" disabled={publish.isPending || !secondsText.trim()} onClick={() => publish.mutate()}>{hasMenu ? 'Publicar nueva versión' : 'Publicar menú'}</Button>

      {hasMenu && <div className="mt-6 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><strong>Pendientes ({pendingUsers.length})</strong><p className="mt-1 text-xs text-muted-foreground">Elige individualmente o revisa la propuesta automática antes de aplicarla.</p></div>
          <Button size="sm" variant="outline" disabled={!data.isOpen || isLoadingPreview || assignMostRequested.isPending || pendingUsers.length === 0} onClick={() => void openAutomaticAssignmentConfirmation()}>{isLoadingPreview ? 'Preparando propuesta...' : 'Asignar más solicitado'}</Button>
        </div>
        {pendingUsers.length > 0 && <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {pendingUsers.map(user => { const accompaniment = getAccompaniment(user.userId); return <div key={user.userId} className="grid grid-cols-1 gap-2 rounded-md border border-border bg-muted/30 p-2.5 lg:grid-cols-[minmax(0,1fr)_13rem_minmax(15rem,1fr)_auto] lg:items-center"><strong className="truncate text-sm" title={user.fullName}>{user.fullName}</strong><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={choices[user.userId] || ''} onChange={event => setChoices(previous => ({ ...previous, [user.userId]: Number(event.target.value) }))}><option value="">Elegir segundo…</option>{data.seconds.map(second => <option key={second.id} value={second.id}>{second.name}</option>)}</select><span className="flex flex-wrap gap-2 text-xs">{data.soupAvailable && <label><input type="checkbox" checked={accompaniment.wantsSoup} onChange={event => setAccompanimentChoices(current => ({ ...current, [user.userId]: { ...accompaniment, wantsSoup: event.target.checked } }))} /> Sopa</label>}{data.dessertAvailable && <label><input type="checkbox" checked={accompaniment.wantsDessert} onChange={event => setAccompanimentChoices(current => ({ ...current, [user.userId]: { ...accompaniment, wantsDessert: event.target.checked } }))} /> Postre</label>}{data.refreshmentAvailable && <label><input type="checkbox" checked={accompaniment.wantsRefreshment} onChange={event => setAccompanimentChoices(current => ({ ...current, [user.userId]: { ...accompaniment, wantsRefreshment: event.target.checked } }))} /> Refresco</label>}</span><Button size="sm" className="w-full sm:w-auto" variant="outline" disabled={!choices[user.userId] || assign.isPending} onClick={() => assign.mutate({ userId: user.userId, secondId: choices[user.userId], accompaniment })}>Asignar</Button></div>; })}
        </div>}
      </div>}

      {hasMenu && automaticUsers.length > 0 && <div className="mt-6 border-t pt-4">
        <strong>Asignados automáticamente ({automaticUsers.length})</strong><p className="mt-1 text-xs text-muted-foreground">Ajusta solo el segundo si hace falta; la sopa propuesta se conserva.</p>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {automaticUsers.map(user => { const selection = user.selection!; const selectedSecondId = choices[user.userId] ?? selection.lunchMenuSecondId; return <div key={user.userId} className="grid grid-cols-1 gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 lg:grid-cols-[minmax(0,1fr)_13rem_minmax(14rem,1fr)_auto] lg:items-center"><strong className="truncate text-sm" title={user.fullName}>{user.fullName}</strong><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={selectedSecondId} onChange={event => setChoices(previous => ({ ...previous, [user.userId]: Number(event.target.value) }))}>{data.seconds.map(second => <option key={second.id} value={second.id}>{second.name}</option>)}</select><span className="text-xs text-muted-foreground">{[data.soupAvailable ? (selection.wantsSoup ? 'Con sopa' : 'Sin sopa') : null, data.dessertAvailable ? (selection.wantsDessert ? 'Con postre' : 'Sin postre') : null, data.refreshmentAvailable ? (selection.wantsRefreshment ? 'Con refresco' : 'Sin refresco') : null].filter(Boolean).join(' · ')}</span><Button size="sm" className="w-full sm:w-auto" variant="outline" disabled={!data.isOpen || assign.isPending} onClick={() => assign.mutate({ userId: user.userId, secondId: selectedSecondId, accompaniment: selection })}>Ajustar segundo</Button></div>; })}
        </div>
      </div>}
    </section>
  );
}
