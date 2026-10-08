import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import { getLunchMenuConsolidated } from './lunchMenu.service';

type Consolidated = { serviceDate: string; totalEligible: number; totalSelected: number; totalPending: number; bySecond: Array<{ second: string; total: number; withSoup: number; withoutSoup: number }>; accompaniments: { soup: { name: string; total: number } | null; dessert: { name: string; total: number } | null; refreshment: { name: string; total: number } | null } };

export default function LunchMenuProviderSummary({ date }: { date: string }) {
  const query = useQuery({ queryKey: ['lunch-menu-consolidated', date], queryFn: () => getLunchMenuConsolidated(date) as Promise<Consolidated>, retry: false });
  if (query.isError || !query.data || !Array.isArray(query.data.bySecond)) return null;
  const text = [
    `*Almuerzo ${query.data.serviceDate}*`,
    ...query.data.bySecond.map(row => `• ${row.second}: ${row.total}`),
    '',
    '*Acompañamientos*',
    ...(query.data.accompaniments.soup ? [`• ${query.data.accompaniments.soup.name}: ${query.data.accompaniments.soup.total}`] : []),
    ...(query.data.accompaniments.dessert ? [`• ${query.data.accompaniments.dessert.name}: ${query.data.accompaniments.dessert.total}`] : []),
    ...(query.data.accompaniments.refreshment ? [`• ${query.data.accompaniments.refreshment.name}: ${query.data.accompaniments.refreshment.total}`] : []),
    `Pendientes: ${query.data.totalPending}`,
  ].join('\n');
  const copyProviderSummary = async () => {
    try {
      await copyTextToClipboard(text);
      SnackbarUtilities.success('Consolidado copiado para WhatsApp');
    } catch {
      SnackbarUtilities.error('No se pudo copiar el consolidado');
    }
  };
  const shareProviderSummary = () => {
    const popup = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    if (!popup) SnackbarUtilities.error('El navegador bloqueó la ventana de WhatsApp');
  };

  return <section className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong>Consolidado para proveedor</strong><div className="flex gap-2"><Button size="sm" variant="outline" onClick={shareProviderSummary}>Compartir WhatsApp</Button><Button size="sm" variant="outline" onClick={() => void copyProviderSummary()}>Copiar</Button></div></div><pre className="whitespace-pre-wrap font-sans text-muted-foreground">{text}</pre></section>;
}
