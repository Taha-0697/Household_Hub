'use client';

import { AppNotification } from '@/types/grocery';

interface NotificationBannerProps {
  notifications: AppNotification[];
  onClear: () => void;
}

export default function NotificationBanner({ notifications, onClear }: NotificationBannerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-amber-800 flex items-center gap-1">🔔 Alerts ({notifications.length})</h3>
        <button onClick={onClear} className="text-xs text-amber-600 hover:underline">Dismiss</button>
      </div>
      <ul className="space-y-1 text-sm text-amber-900">
        {notifications.map((n) => (
          <li key={n.id} className="py-0.5">{n.message}</li>
        ))}
      </ul>
    </div>
  );
}