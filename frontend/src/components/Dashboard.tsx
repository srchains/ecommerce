import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Database, 
  ShoppingBag, 
  Hammer, 
  AlertTriangle,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const { livePrice, designs } = useApp();

  const chartData = React.useMemo(() => {
    if (!livePrice || !livePrice.history || livePrice.history.length === 0) {
      // Fallback data if history is not available
      return [
        { time: '00:00', rate: 220.5 },
        { time: '03:00', rate: 221.2 },
        { time: '06:00', rate: 220.8 },
        { time: '09:00', rate: 222.4 },
        { time: '12:00', rate: 221.9 },
        { time: '15:00', rate: 223.1 },
        { time: '18:00', rate: 222.7 },
        { time: '21:00', rate: 224.2 }
      ];
    }
    return livePrice.history.map(h => {
      const date = new Date(h.timestamp);
      const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        time: timeStr,
        rate: h.rate
      };
    });
  }, [livePrice]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-md text-xs font-sans">
          <p className="text-gray-500 font-medium">{payload[0].payload.time}</p>
          <p className="text-gray-900 font-bold font-mono mt-1">₹{payload[0].value.toFixed(2)}/g</p>
        </div>
      );
    }
    return null;
  };

  const metrics = [
    {
      name: "Today's Silver Rate",
      value: livePrice ? `₹${livePrice.silver_gram_rate.toFixed(2)}/g` : '₹95.50/g',
      subtext: livePrice ? `Kg Rate: ₹${(livePrice.silver_kg_rate).toLocaleString('en-IN')}` : 'Kg Rate: ₹95,500',
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
              <p className="text-2xl font-bold font-mono mt-2">₹{livePrice?.silver_gram_rate.toFixed(2)}</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111827" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#111827" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#111827" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#rateGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
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
    </div>
  );
};