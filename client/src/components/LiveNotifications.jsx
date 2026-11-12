import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { getAccessToken } from '../services/api.js';
import { notificationApi } from '../services/resources.js';
import { dhaka } from '../utils/format.js';
import { Button } from './ui/primitives.jsx';

const LiveNotificationContext = createContext(null);

function useLiveNotifications() {
  return useContext(LiveNotificationContext);
}

function describe(t, item) {
  return t(`notify.${item.type}`, {
    orderNumber: item.orderNumber,
    invoiceNumber: item.invoiceNumber,
  });
}

export function LiveNotificationsProvider({ children }) {
  const { t } = useTranslation();
  const translate = useRef(t);
  const userId = useSelector((state) => state.auth.user?.id);
  useEffect(() => {
    translate.current = t;
  }, [t]);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    notificationApi.list().then((res) => {
      if (!active) return;
      setItems(res.data || []);
      setUnread(res.meta?.unread || 0);
    }).catch(() => {});
    const socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token: getAccessToken() || '' } });
    socket.on('notification:new', (payload) => {
      const notification = payload?.notification;
      if (!notification) return;
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 40));
      if (typeof payload.unread === 'number') setUnread(payload.unread);
      toast(describe(translate.current, notification));
    });
    socket.on('notification:count', (payload) => {
      if (typeof payload?.unread === 'number') setUnread(payload.unread);
    });
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [userId]);

  async function markRead(id) {
    const res = await notificationApi.read({ id });
    setUnread(res.data?.unread ?? 0);
    setItems((current) => current.map((item) => (String(item.id) === String(id) ? { ...item, readAt: item.readAt || new Date().toISOString() } : item)));
  }

  async function markAllRead() {
    const res = await notificationApi.read({ all: true });
    setUnread(res.data?.unread ?? 0);
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  return (
    <LiveNotificationContext.Provider value={{ items: userId ? items : [], unread: userId ? unread : 0, markRead, markAllRead }}>
      {children}
    </LiveNotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const live = useLiveNotifications();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (!event.target.closest?.('[data-notifications]')) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  if (!live) return null;
  const unread = live.unread || 0;
  async function openItem(item) {
    setOpen(false);
    if (!item.readAt) await live.markRead(item.id);
    if (item.href) navigate(item.href);
  }
  return (
    <div className="relative" data-notifications>
      <button
        type="button"
        className="relative rounded-full p-2.5 hover:bg-[#f6f3ee]"
        aria-label={t('notify.bell')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 ? <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-kelp-700 px-1 text-[10px] font-medium text-white">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ocean-900/10 bg-white p-2 text-ocean-950 shadow-card">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium">{t('notify.title')}</p>
            {unread > 0 ? <button type="button" className="text-xs text-ocean-800 underline" onClick={() => live.markAllRead()}>{t('notify.markAll')}</button> : null}
          </div>
          {live.items.length === 0 ? <p className="px-2 py-4 text-sm text-ocean-900/60">{t('notify.empty')}</p> : (
            <ul className="max-h-80 overflow-auto">
              {live.items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <button type="button" className="w-full rounded-xl px-2 py-2 text-left hover:bg-[#f6f3ee]" onClick={() => openItem(item)}>
                    <span className={`block text-sm ${item.readAt ? 'text-ocean-900/70' : 'font-medium'}`}>{describe(t, item)}</span>
                    <span className="text-xs text-ocean-900/50">{dhaka(item.createdAt, i18n.language)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" className="mt-1 w-full" onClick={() => { setOpen(false); navigate('/account/notifications'); }}>{t('notify.all')}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const live = useLiveNotifications();
  if (!live) return null;
  async function openItem(item) {
    if (!item.readAt) await live.markRead(item.id);
    if (item.href) navigate(item.href);
  }
  return (
    <div className="container-page max-w-3xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">{t('notify.title')}</h1>
        {live.unread > 0 ? <Button variant="outline" onClick={() => live.markAllRead()}>{t('notify.markAll')}</Button> : null}
      </div>
      {live.items.length === 0 ? <p className="mt-6 text-ocean-900/70">{t('notify.empty')}</p> : (
        <ul className="mt-6 divide-y divide-ocean-900/10">
          {live.items.map((item) => (
            <li key={item.id}>
              <button type="button" className="flex w-full items-start gap-3 py-4 text-left" onClick={() => openItem(item)}>
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-kelp-700'}`} />
                <span>
                  <span className={`block ${item.readAt ? '' : 'font-medium'}`}>{describe(t, item)}</span>
                  <span className="text-sm text-ocean-900/55">{dhaka(item.createdAt, i18n.language)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
