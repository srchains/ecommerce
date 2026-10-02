// Lightweight storefront analytics for the admin "Traffic" page.
// Visitors are anonymous: a random ID kept in this browser (no IP address is stored).
// Tracking is skipped on /admin so staff activity does not count as customer traffic.

// Same rule as AppContext's API_BASE_URL (not imported, to avoid a circular import with AppContext)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export type TrafficEventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'catalog_download'
  | 'login'
  | 'order';

interface TrackData {
  page?: string;
  design_code?: string;
  label?: string;
  value?: number;
}

const VISITOR_KEY = 'sr_visitor_id';
const SESSION_KEY = 'sr_session';
const SESSION_IDLE_MS = 30 * 60 * 1000; // a new visit starts after 30 minutes of inactivity

let customerEmail: string | null = null;
let fallbackVisitorId: string | null = null;
let fallbackSession: { id: string; last: number } | null = null;

const randomId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const getVisitorId = (): string => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode etc.): keep an ID for this page load only
    if (!fallbackVisitorId) fallbackVisitorId = randomId();
    return fallbackVisitorId;
  }
};

const getSessionId = (): string => {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as { id: string; last: number } | null;
    const session = stored && now - stored.last < SESSION_IDLE_MS ? stored : { id: randomId(), last: now };
    session.last = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch {
    if (!fallbackSession || now - fallbackSession.last >= SESSION_IDLE_MS) fallbackSession = { id: randomId(), last: now };
    fallbackSession.last = now;
    return fallbackSession.id;
  }
};

/** Attach the logged-in buyer's email to later events (null on logout). */
export const setAnalyticsCustomer = (email: string | null) => {
  customerEmail = email ? email.trim().toLowerCase() : null;
};

/** Fire-and-forget: never throws, never blocks the page. */
export const trackEvent = (eventType: TrafficEventType, data: TrackData = {}) => {
  try {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
    const body = JSON.stringify({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_type: eventType,
      customer_email: customerEmail,
      referrer: eventType === 'page_view' ? document.referrer || null : null,
      ...data,
    });
    const url = `${API_BASE_URL}/api/analytics/track`;
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
    fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the store */
  }
};
