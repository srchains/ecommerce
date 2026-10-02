import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity, Users, Eye, ShoppingBag, IndianRupee, Percent, FileDown, UserCheck, RefreshCw, AlertCircle,
  Smartphone, Monitor, Tablet, Globe
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL, useApp } from '../context/AppContext';

// Chart colors: validated pair (light surface, CVD-safe) - amber = visitors, blue = orders
const VISITOR_COLOR = '#d97706';
const ORDER_COLOR = '#2563eb';

interface Summary {
  days: number;
  kpis: {
    visitors: number; new_visitors: number; returning_visitors: number; sessions: number;
    page_views: number; product_views: number; catalog_downloads: number; logged_in_customers: number;
    orders: number; revenue: number; conversion_rate: number; live_now: number;
  };
  funnel: { step: string; visitors: number }[];
  daily: { date: string; visitors: number; page_views: number; orders: number; revenue: number }[];
  top_products: { design_code: string; views: number; viewers: number; added_to_cart: number; ordered_qty: number }[];
  devices: { device: string; visitors: number }[];
  referrers: { source: string; visitors: number }[];
  downloads: { catalogue: string; count: number }[];
  customers: {
    name: string; email: string; mobile: string | null; visits: number; product_views: number;
    last_seen: string; orders: number; order_value: number;
  }[];
  recent_orders: {
    order_number: string; customer_name: string; mobile: string | null; date: string;
    status: string; items: number; value: number;
  }[];
}

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (n: number) => n.toLocaleString('en-IN');
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const DEVICE_ICONS: Record<string, React.ElementType> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

/** Horizontal labelled bar (single hue; value and label in text ink, never the bar color). */
const BarRow: React.FC<{ label: React.ReactNode; value: number; max: number; color?: string; suffix?: string }> = ({
  label, value, max, color = VISITOR_COLOR, suffix
}) => (
  <div className="space-y-1" title={`${value}${suffix ? ' ' + suffix : ''}`}>
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-gray-700 truncate">{label}</span>
      <span className="font-mono font-bold text-gray-900 shrink-0 ml-2">{num(value)}{suffix ? <span className="text-gray-500 font-sans font-medium"> {suffix}</span> : null}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${max && value > 0 ? Math.max(2, (value / max) * 100) : 0}%`, background: color }} />
    </div>
  </div>
);

const DailyChart: React.FC<{ data: Summary['daily']; dataKey: 'visitors' | 'orders'; color: string; unit: string }> = ({
  data, dataKey, color, unit
}) => (
  <div className="h-56">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          labelFormatter={(d) => shortDate(String(d))}
          formatter={(v) => [`${v} ${unit}`, '']}
          separator=""
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const AdminTrafficAnalytics: React.FC = () => {
  const { adminRole } = useApp();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const load = async (range = days) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/analytics/summary`, { params: { days: range } });
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load traffic data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    const timer = setInterval(() => load(days), 60_000); // keep "live now" fresh
    return () => clearInterval(timer);
  }, [days]);

  if (adminRole !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Only the admin can view traffic and visitor reports.
        </div>
      </div>
    );
  }

  const k = data?.kpis;
  const rangeLabel = RANGES.find(r => r.days === days)?.label.toLowerCase() || `${days} days`;
  const metrics = k ? [
    { name: 'Visitors', value: num(k.visitors), icon: Users, sub: `${num(k.new_visitors)} new • ${num(k.returning_visitors)} returning` },
    { name: 'Page Views', value: num(k.page_views), icon: Eye, sub: `${num(k.product_views)} product views • ${num(k.sessions)} visits` },
    { name: 'Customers Visited', value: num(k.logged_in_customers), icon: UserCheck, sub: 'Logged-in buyers who came to the site' },
    { name: 'Catalogue Downloads', value: num(k.catalog_downloads), icon: FileDown, sub: 'PDF catalogues downloaded' },
    { name: 'Orders', value: num(k.orders), icon: ShoppingBag, sub: 'Orders placed in this period' },
    { name: 'Order Value', value: inr(k.revenue), icon: IndianRupee, sub: 'Total value of those orders' },
    { name: 'Conversion Rate', value: `${k.conversion_rate}%`, icon: Percent, sub: 'Visitors who placed an order' },
    { name: 'Live Now', value: num(k.live_now), icon: Activity, sub: 'Visitors active in the last 5 minutes' },
  ] : [];
  const funnelTop = data?.funnel[0]?.visitors || 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header flex-wrap gap-3">
        <div>
          <h2 className="page-title">Traffic & Visitors</h2>
          <p className="muted-text text-sm mt-2">
            Who visits the store, what they look at, and how many go on to place an order.
          </p>
        </div>
        {/* Filters: one row above the charts */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  days === r.days ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(days)}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {!data && loading && <div className="p-8 text-center text-sm text-gray-400">Loading traffic data…</div>}

      {data && k && (
        <>
          {k.visitors === 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No visitors recorded {days === 1 ? 'today' : `in the last ${rangeLabel}`} yet. Visitor tracking starts from when this feature went live; order numbers include your earlier orders.</span>
            </div>
          )}

          {/* KPI tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.name} className="metric-card">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="metric-label">{m.name}</p>
                      <h3 className="metric-value mt-3 font-mono text-lg sm:text-2xl break-words">{m.value}</h3>
                    </div>
                    <div className="icon-box shrink-0"><Icon className="h-4 w-4" /></div>
                  </div>
                  <p className="metric-subtext mt-3">{m.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Daily trend: two single-series charts (different scales -> never one dual-axis chart) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="enterprise-panel p-5 space-y-3">
              <div>
                <h3 className="card-title">Visitors per day</h3>
                <p className="text-xs text-gray-500 mt-1">Unique visitors each day (India time)</p>
              </div>
              <DailyChart data={data.daily} dataKey="visitors" color={VISITOR_COLOR} unit="visitors" />
            </div>
            <div className="enterprise-panel p-5 space-y-3">
              <div>
                <h3 className="card-title">Orders per day</h3>
                <p className="text-xs text-gray-500 mt-1">Orders placed each day</p>
              </div>
              <DailyChart data={data.daily} dataKey="orders" color={ORDER_COLOR} unit="orders" />
            </div>
          </div>
          <div>
            <button onClick={() => setShowTable(s => !s)} className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer">
              {showTable ? 'Hide' : 'Show'} daily numbers as a table
            </button>
            {showTable && (
              <div className="mt-3 enterprise-panel overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-right px-4 py-2">Visitors</th>
                      <th className="text-right px-4 py-2">Page views</th>
                      <th className="text-right px-4 py-2">Orders</th>
                      <th className="text-right px-4 py-2">Order value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...data.daily].reverse().map(d => (
                      <tr key={d.date}>
                        <td className="px-4 py-2 text-gray-700">{shortDate(d.date)}</td>
                        <td className="px-4 py-2 text-right font-mono">{d.visitors}</td>
                        <td className="px-4 py-2 text-right font-mono">{d.page_views}</td>
                        <td className="px-4 py-2 text-right font-mono">{d.orders}</td>
                        <td className="px-4 py-2 text-right font-mono">{inr(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Funnel */}
            <div className="enterprise-panel p-5 space-y-4">
              <div>
                <h3 className="card-title">Visitor journey</h3>
                <p className="text-xs text-gray-500 mt-1">How many visitors reached each step</p>
              </div>
              {data.funnel.map((f, i) => (
                <BarRow
                  key={f.step}
                  label={<>{f.step}{i > 0 && funnelTop ? <span className="text-gray-400 font-medium"> • {Math.round((f.visitors / funnelTop) * 100)}%</span> : null}</>}
                  value={f.visitors}
                  max={funnelTop}
                  color={i === data.funnel.length - 1 ? ORDER_COLOR : VISITOR_COLOR}
                />
              ))}
            </div>

            {/* Devices + sources */}
            <div className="enterprise-panel p-5 space-y-4">
              <div>
                <h3 className="card-title">Devices</h3>
                <p className="text-xs text-gray-500 mt-1">Visitors by device type</p>
              </div>
              {data.devices.length === 0 && <p className="text-xs text-gray-400">No data yet.</p>}
              {data.devices.map(d => {
                const Icon = DEVICE_ICONS[d.device] || Monitor;
                return (
                  <BarRow
                    key={d.device}
                    label={<span className="inline-flex items-center gap-1.5 capitalize"><Icon className="h-3.5 w-3.5 text-gray-400" />{d.device}</span>}
                    value={d.visitors}
                    max={data.devices[0].visitors}
                  />
                );
              })}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-gray-400" />Came from</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Other sites that sent visitors (direct visits not shown)</p>
                {data.referrers.length === 0 && <p className="text-xs text-gray-400">No referring sites yet.</p>}
                <div className="space-y-3">
                  {data.referrers.map(r => (
                    <BarRow key={r.source} label={r.source} value={r.visitors} max={data.referrers[0].visitors} />
                  ))}
                </div>
              </div>
            </div>

            {/* Catalogue downloads */}
            <div className="enterprise-panel p-5 space-y-4">
              <div>
                <h3 className="card-title">Catalogue downloads</h3>
                <p className="text-xs text-gray-500 mt-1">Which PDF catalogues buyers downloaded</p>
              </div>
              {data.downloads.length === 0 && <p className="text-xs text-gray-400">No downloads yet.</p>}
              {data.downloads.map(d => (
                <BarRow key={d.catalogue} label={d.catalogue} value={d.count} max={data.downloads[0].count} suffix="downloads" />
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="enterprise-panel overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="card-title">Most viewed products</h3>
              <p className="text-xs text-gray-500 mt-1">Views, cart adds and ordered quantity in this period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-right px-4 py-2">Views</th>
                    <th className="text-right px-4 py-2">Unique viewers</th>
                    <th className="text-right px-4 py-2">Added to cart</th>
                    <th className="text-right px-4 py-2">Ordered (pcs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.top_products.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No product views yet.</td></tr>
                  )}
                  {data.top_products.map(p => (
                    <tr key={p.design_code} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-gray-900 font-mono">{p.design_code}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.views}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.viewers}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.added_to_cart}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.ordered_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Customers who visited */}
            <div className="enterprise-panel overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="card-title">Customers who visited</h3>
                <p className="text-xs text-gray-500 mt-1">Logged-in buyers, and whether they ordered in this period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2">Customer</th>
                      <th className="text-right px-4 py-2">Visits</th>
                      <th className="text-left px-4 py-2">Last seen</th>
                      <th className="text-left px-4 py-2">Ordered?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.customers.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No logged-in customers visited in this period.</td></tr>
                    )}
                    {data.customers.map(c => (
                      <tr key={c.email} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-gray-900">{c.name}</div>
                          <div className="text-[11px] text-gray-500">{c.mobile || c.email}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{c.visits}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{dateTime(c.last_seen)}</td>
                        <td className="px-4 py-2.5">
                          {c.orders > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                              <ShoppingBag className="h-3 w-3" /> {c.orders} • {inr(c.order_value)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
                              <Eye className="h-3 w-3" /> Visited only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent orders */}
            <div className="enterprise-panel overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="card-title">Recent orders</h3>
                <p className="text-xs text-gray-500 mt-1">Latest orders placed in this period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2">Order</th>
                      <th className="text-left px-4 py-2">Customer</th>
                      <th className="text-right px-4 py-2">Pcs</th>
                      <th className="text-right px-4 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recent_orders.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No orders in this period.</td></tr>
                    )}
                    {data.recent_orders.map(o => (
                      <tr key={o.order_number} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-gray-900 font-mono">{o.order_number}</div>
                          <div className="text-[11px] text-gray-500">{dateTime(o.date)} • {o.status}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-gray-800">{o.customer_name}</div>
                          <div className="text-[11px] text-gray-500">{o.mobile}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{o.items}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">{inr(o.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Visitors are counted anonymously per browser (no IP addresses stored). Staff activity on the admin panel is not counted.
          </p>
        </>
      )}
    </div>
  );
};
