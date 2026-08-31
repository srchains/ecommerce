import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Database, 
  ShoppingBag, 
  Hammer, 
  AlertTriangle,
  Award,
  Wrench,
  CheckCircle,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import { useApp, API_BASE_URL } from '../context/AppContext';
import { TradingViewChart } from './TradingViewChart';

export const Dashboard: React.FC = () => {
  const { livePrice, designs, fetchDesigns, fetchCategories } = useApp();
  const [diagResult, setDiagResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  const runDiagnose = async () => {
    try {
      setDiagLoading(true);
      setDiagError(null);
      setDiagResult(null);
      setFixResult(null);
      const res = await axios.get(`${API_BASE_URL}/api/products/diagnose-categories`);
      setDiagResult(res.data);
    } catch (err: any) {
      setDiagError(err.response?.data?.detail || 'Diagnose failed');
    } finally {
      setDiagLoading(false);
    }
  };

  const runFix = async () => {
    try {
      setFixLoading(true);
      setDiagError(null);
      const res = await axios.post(`${API_BASE_URL}/api/products/fix-categories`);
      setFixResult(res.data);
      // Refresh data so sidebar counts update immediately
      await Promise.all([fetchDesigns(''), fetchCategories()]);
    } catch (err: any) {
      setDiagError(err.response?.data?.detail || 'Fix failed');
    } finally {
      setFixLoading(false);
    }
  };



  const metrics = [
    {
      name: "Today's Silver Rate",
      value: livePrice?.silver_gram_rate ? `₹${livePrice.silver_gram_rate.toFixed(2)}/g` : '₹222.00/g',
      subtext: livePrice ? `Kg Rate: ₹${(livePrice.silver_kg_rate).toLocaleString('en-IN')}` : 'Kg Rate: ₹2,22,000',
      icon: TrendingUp
    },
    {
      name: 'Ready Stock Value',
      value: '₹45,82,450',
      subtext: 'Total 48,230g in stock',
      icon: DollarSign
    },
    {
      name: 'Total Products (SKUs)',
      value: '156 SKUs',
      subtext: 'Across 4 active variants',
      icon: Layers
    },
    {
      name: 'Total Active Designs',
      value: `${designs.length} Designs`,
      subtext: 'Daily Wear & Antique collections',
      icon: Database
    },
    {
      name: 'Pending Orders',
      value: '12 Orders',
      subtext: '8 Ready Stock, 4 Made to Order',
      icon: ShoppingBag
    },
    {
      name: 'Manufacturing Queue',
      value: '18 Jobs',
      subtext: '6 in Casting, 4 in Quality Check',
      icon: Hammer
    },
    {
      name: 'Low Stock Alerts',
      value: '5 Sizes',
      subtext: 'Below minimum order threshold',
      icon: AlertTriangle
    },
    {
      name: 'Top Selling Design',
      value: 'ANK-1025',
      subtext: 'Floral Bell (142 inquiries)',
      icon: Award
    }
  ];

  const lowStockItems = [
    { code: 'ANK-1025-WHT', size: 4.5, stock: 0, status: 'MTO Available' },
    { code: 'ANK-1025-WHT', size: 4.75, stock: 0, status: 'MTO Available' },
    { code: 'ANK-1025-WHT', size: 8.0, stock: 0, status: 'MTO Available' },
    { code: 'ANK-1026-SLV', size: 8.0, stock: 2, status: 'Low Stock' },
    { code: 'ANK-1026-SLV', size: 9.0, stock: 1, status: 'Low Stock' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Admin Dashboard</h2>
          <p className="muted-text text-sm mt-2">Enterprise operations summary for silver jewelry manufacturing and wholesale distribution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="metric-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="metric-label">{m.name}</p>
                  <h3 className="metric-value mt-3 font-mono">{m.value}</h3>
                </div>
                <div className="icon-box">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="metric-subtext mt-3">{m.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 enterprise-panel p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="card-title">Live Precious Metals Rate Index</h3>
              <p className="text-sm text-gray-500 mt-1">Wholesale billing rates synchronize with the live silver spot index.</p>
            </div>
            <span className="badge-success">Updates Live</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Silver Gram Rate</p>
              <p className="text-2xl font-bold font-mono mt-2">₹{livePrice?.silver_gram_rate?.toFixed(2) || '222.00'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Silver Kilogram Rate</p>
              <p className="text-2xl font-bold font-mono mt-2">₹{livePrice ? (livePrice.silver_kg_rate).toLocaleString('en-IN') : '95,500.00'}</p>
            </div>
          </div>

          <div className="chart-card p-4">
            <div className="flex items-center justify-between pb-4">
              <h4 className="text-sm font-bold text-gray-900">Silver Rate Movement</h4>
              <span className="text-xs text-gray-500 font-mono">Source: {livePrice?.source || 'Mock Data'}</span>
            </div>
            <div className="h-[260px] w-full">
              <TradingViewChart history={livePrice?.history || []} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Data Source</span>
              <span className="font-semibold">{livePrice?.source || 'Mock Initial'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-gray-500">Last Sync</span>
              <span className="font-mono font-semibold">
                {livePrice ? new Date(livePrice.last_updated).toLocaleTimeString('en-IN') : '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        <div className="enterprise-panel p-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="card-title">Inventory Status Alerts</h3>
              <p className="text-sm text-gray-500 mt-1">Sizes requiring replenishment or MTO planning.</p>
            </div>
            <span className="badge-warning">5 Alerts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Design Code</th>
                  <th>Size</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-mono font-semibold">{item.code}</td>
                    <td className="font-mono">{item.size.toFixed(2)}"</td>
                    <td className="font-mono font-semibold">{item.stock}</td>
                    <td>
                      <span className={item.stock === 0 ? 'badge-danger' : 'badge-warning'}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Category Fix Tool ── */}
      <div className="enterprise-panel p-6">
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-5">
          <div>
            <h3 className="card-title flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              Category Fix Tool
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              If products appear in "All Collections" but disappear when you click a specific category (e.g. Flower, Titanic), use this tool to auto-detect and fix the issue.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <button
            onClick={runDiagnose}
            disabled={diagLoading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {diagLoading ? (
              <span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {diagLoading ? 'Diagnosing...' : 'Diagnose Categories'}
          </button>

          {diagResult && diagResult.missing_from_sidebar > 0 && (
            <button
              onClick={runFix}
              disabled={fixLoading}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {fixLoading ? (
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {fixLoading ? 'Fixing...' : `Fix ${diagResult.missing_from_sidebar} Missing Product(s)`}
            </button>
          )}
        </div>

        {diagError && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <XCircle className="h-4 w-4 shrink-0" />
            {diagError}
          </div>
        )}

        {diagResult && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg border ${
              diagResult.missing_from_sidebar === 0
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {diagResult.missing_from_sidebar === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {diagResult.missing_from_sidebar === 0
                ? `All ${diagResult.total_active_designs} active products are properly categorized!`
                : `Found ${diagResult.missing_from_sidebar} product(s) missing from category filters (visible in All Collections only).`
              }
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {diagResult.sidebar_counts.map((s: any) => (
                <div key={s.category_id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.category_name}</p>
                  <p className="text-2xl font-bold font-mono mt-1">{s.active_count}</p>
                </div>
              ))}
            </div>

            {diagResult.orphaned_designs.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Affected Products:</p>
                <div className="space-y-2">
                  {diagResult.orphaned_designs.map((d: any) => (
                    <div key={d.design_id} className="flex items-center gap-3 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="font-mono font-bold text-gray-900">{d.design_code}</span>
                      <span className="text-gray-500">{d.name}</span>
                      <span className="ml-auto text-xs text-amber-700">category: {d.current_category_name || 'None'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {fixResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle className="h-4 w-4" />
              {fixResult.message}
            </div>
            {fixResult.fixed.map((f: any) => (
              <div key={f.design_code} className="flex items-center gap-3 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="font-mono font-bold">{f.design_code}</span>
                <span className="text-gray-500">→ moved to <strong>{f.new_category_name}</strong></span>
              </div>
            ))}
            {fixResult.could_not_fix.map((f: any) => (
              <div key={f.design_code} className="flex items-center gap-3 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="font-mono font-bold">{f.design_code}</span>
                <span className="text-gray-500">{f.reason} — please edit manually in All Designs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};