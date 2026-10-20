import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  HUB_NOTIFICATIONS_UPDATED_EVENT,
  listHubNotifications,
} from "@/lib/hubNotifications";

const SEEN_KEY = "lst-hub-notification-seen";
const SINCE_KEY = "lst-hub-notification-since";

function notificationSince(session) {
  const email = String(session?.email || "").trim().toLowerCase();
  if (!email || typeof window === "undefined") return "";
  const key = `${SINCE_KEY}:${email}`;
  const stored = window.localStorage.getItem(key);
  if (stored) return stored;

  const accountTime = Date.parse(session?.accountCreatedAt || "");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const since =
    Number.isFinite(accountTime) && accountTime > weekAgo
      ? new Date(accountTime).toISOString()
      : new Date().toISOString();
  window.localStorage.setItem(key, since);
  return since;
}

function readSeenIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

function writeSeenIds(ids) {
  if (typeof window === "undefined") return;
  const unique = [...new Set(ids.map((id) => String(id)))].slice(-200);
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(unique));
}

function formatWhen(iso) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationBell({ session }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [seenIds, setSeenIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSeenIds(readSeenIds());
  }, []);

  useEffect(() => {
    if (!session?.email && !session?.name) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const next = await listHubNotifications(session, { since: notificationSince(session) });
        if (!cancelled) setItems(next);
      } catch (error) {
        console.error("Unable to load notifications", error);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 60000);

    function refresh() {
      void load();
    }

    window.addEventListener(HUB_NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(HUB_NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [session]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const seen = new Set(seenIds);
  const unreadCount = items.filter((item) => !seen.has(item.id)).length;

  function markIdsRead(ids) {
    const next = [...new Set([...seenIds, ...ids])];
    setSeenIds(next);
    writeSeenIds(next);
  }

  function toggleOpen() {
    if (!open) markIdsRead(items.map((item) => item.id));
    setOpen((current) => !current);
  }

  function openItem(item) {
    markIdsRead([item.id]);
    setOpen(false);
    if (item.href) void router.push(item.href);
  }

  if (!session?.email && !session?.name) return null;

  return (
    <div className="hubNotificationBell" ref={rootRef}>
      <button
        className="hubNotificationBellButton"
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} new` : "Notifications"}
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount ? (
          <span className="hubNotificationBadge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <div className="hubNotificationPanel" role="dialog" aria-label="Notifications">
          <div className="hubNotificationPanelHeader">
            <div>
              <div className="hubNotificationPanelTitle">Notifications</div>
              <div className="small">New assignments and other important updates.</div>
            </div>
          </div>
          <div className="hubNotificationList">
            {loading && !items.length ? (
              <div className="small hubNotificationEmpty">Loading…</div>
            ) : null}
            {!loading && !items.length ? (
              <div className="small hubNotificationEmpty">
                Nothing new. When someone assigns you a task, it will show up here.
              </div>
            ) : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`hubNotificationItem${seen.has(item.id) ? "" : " isUnread"}`}
                onClick={() => openItem(item)}
              >
                <span className="hubNotificationItemTitle">{item.title}</span>
                {item.detail ? <span className="hubNotificationItemDetail">{item.detail}</span> : null}
                <span className="hubNotificationItemMeta">
                  {[item.actorName, formatWhen(item.createdAt)].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
