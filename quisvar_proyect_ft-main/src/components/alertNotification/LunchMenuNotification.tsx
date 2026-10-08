import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Utensils } from 'lucide-react';
import notificationSound from '/sounds/notification.mp3';
import { axiosInstance } from '@/services/axiosInstance';
import { SocketContext } from '@/context/SocketContex';

type CurrentLunchMenu = { serviceDate: string; closesAt: string; seconds: Array<{ id: number; name: string }>; soupAvailable: boolean; soupName: string | null; dessertAvailable: boolean; dessertName: string | null; refreshmentAvailable: boolean; refreshmentName: string | null } | null;
const toServiceDateKey = (value: string) => value.slice(0, 10);

export default function LunchMenuNotification() {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useContext(SocketContext);
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const query = useQuery({ queryKey: ['current-lunch-menu'], queryFn: async () => (await axiosInstance.get<CurrentLunchMenu>('/lunch-menus/current')).data, retry: false });
  useEffect(() => {
    const refreshLunchMenu = () =>
      void queryClient.invalidateQueries({ queryKey: ['current-lunch-menu'] });
    socket.on('server:lunch-menu-updated', refreshLunchMenu);
    socket.on('connect', refreshLunchMenu);
    return () => {
      socket.off('server:lunch-menu-updated', refreshLunchMenu);
      socket.off('connect', refreshLunchMenu);
    };
  }, [queryClient, socket]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  const remaining = useMemo(() => { if (!query.data) return 0; return Math.max(0, Math.ceil((new Date(query.data.closesAt).getTime() - now) / 1000)); }, [query.data, now]);
  useEffect(() => { if (query.data) { const audio = new Audio(notificationSound); void audio.play().catch(() => undefined); } }, [query.data?.closesAt]);
  if (!query.data || remaining === 0 || location.pathname === '/cocina/formulario') return null;
  const clock = [Math.floor(remaining / 3600), Math.floor((remaining % 3600) / 60), remaining % 60].map(value => String(value).padStart(2, '0')).join(':');
  const selectedDate = toServiceDateKey(query.data.serviceDate);
  const serviceDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const accompaniments = [query.data.soupAvailable ? `Sopa: ${query.data.soupName || 'Sopa'}` : null, query.data.dessertAvailable ? `Postre: ${query.data.dessertName || 'Postre'}` : null, query.data.refreshmentAvailable ? `Refresco: ${query.data.refreshmentName || 'Refresco'}` : null].filter(Boolean);
  return <aside className="alertNotify-content alertNotify-content--attendance" aria-live="polite"><div className="alertNotify-heading"><div><span className="alertNotify-eyebrow"><Utensils size={14} /> Menú de almuerzo · {serviceDate}</span><h4 className="alertNotify-title">Elige tu almuerzo</h4></div><BellRing size={18} /></div><div className="alertNotify-attendanceBody"><p className="alertNotify-status">Tienes {clock} para elegir.</p><p className="alertNotify-origin">{query.data.seconds.map(second => second.name).join(' · ')}</p><p className="alertNotify-origin">{accompaniments.join(' · ')}</p><button className="alertNotify-action" type="button" onClick={() => navigate(`/cocina/formulario?date=${selectedDate}`)}>Elegir menú</button></div></aside>;
}
