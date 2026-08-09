import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadNotifications = async () => {
      setError("");
      setIsLoading(true);

      const { data, error } = await supabase.rpc("get_my_notifications");

      setIsLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      setNotifications(data || []);
    };

    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleMarkRead = async (notificationId) => {
    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });

    if (!error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Updates
        </p>
        <h2 className="mt-2 text-3xl font-bold">Notifications</h2>
        <p className="mt-1 text-slate-500">
          {isLoading
            ? "Loading notifications..."
            : unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "You are all caught up."}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      {!error && notifications.length === 0 ? (
        <div className="rounded-lg bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-950">No notifications yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Updates about your attendance will show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="animate-stagger divide-y divide-slate-200">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleMarkRead(item.id)}
                disabled={item.is_read}
                className={`flex w-full gap-4 px-5 py-4 text-left transition ${
                  item.is_read ? "bg-white" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-slate-950">{item.title}</h4>
                    {!item.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-slate-900" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatTime(item.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;
