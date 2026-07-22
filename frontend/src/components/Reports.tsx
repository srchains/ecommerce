import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Scale, 
  DollarSign, 
  BarChart2, 
  PieChart as PieChartIcon, 
  Activity,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface ReportsProps {
  orders: any[];
  loading: boolean;
}

export const Reports: React.FC<ReportsProps> = ({ orders, loading }) => {

  // 1. Calculate KPI Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalWeight = 0;
    let avgOrderValue = 0;

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        totalRevenue += item.price * item.quantity;
        totalWeight += item.weight * item.quantity;
      });
    });

    if (totalOrders > 0) {
      avgOrderValue = totalRevenue / totalOrders;
    }

    return {
      totalRevenue,
      totalOrders,
      totalWeight,
      avgOrderValue
    };
  }, [orders]);

  // 2. Timeline sales trend data
  const timelineData = useMemo(() => {
    // Group sales by date
    const dailySales: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.order_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      });
      let orderVal = 0;
      order.items.forEach((item: any) => {
        orderVal += item.price * item.quantity;
      });
      dailySales[date] = (dailySales[date] || 0) + orderVal;
    });

    // Convert to array and sort chronologically (since orders are desc, we reverse them)
    return Object.keys(dailySales).map(date => ({
      date,
      sales: parseFloat(dailySales[date].toFixed(2))
    })).reverse(); // show oldest to newest
  }, [orders]);

  // 3. Top selling designs data
  const topDesignsData = useMemo(() => {
    const designQuantities: Record<string, { qty: number; revenue: number }> = {};
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const entry = designQuantities[item.design_code] || { qty: 0, revenue: 0 };
        entry.qty += item.quantity;
        entry.revenue += item.price * item.quantity;
        designQuantities[item.design_code] = entry;
      });
    });

    return Object.keys(designQuantities)
      .map(code => ({
        name: code,
        quantity: designQuantities[code].qty,
        revenue: parseFloat(designQuantities[code].revenue.toFixed(2))
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5
  }, [orders]);

  // 4. Order type distribution (Ready Stock vs Make-to-Order)
  const orderTypeData = useMemo(() => {
    let readyStockCount = 0;
    let makeOrderCount = 0;

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        if (item.order_type === 'ready_stock') {
          readyStockCount += item.quantity;
        } else {
          makeOrderCount += item.quantity;
        }
      });
    });

    return [
      { name: 'Ready Stock', value: readyStockCount },
      { name: 'Make to Order (MTO)', value: makeOrderCount }
    ];
  }, [orders]);

  const COLORS = ['#111827', '#6b7280'];

  // 5. Detailed Sales by Design Table
  const salesTableData = useMemo(() => {
    const designSalesMap: Record<string, { name: string; qty: number; weight: number; revenue: number }> = {};
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const entry = designSalesMap[item.design_code] || { name: item.design_code, qty: 0, weight: 0, revenue: 0 };
        entry.qty += item.quantity;
        entry.weight += item.weight * item.quantity;
        entry.revenue += item.price * item.quantity;
        designSalesMap[item.design_code] = entry;
      });
    });

    return Object.values(designSalesMap).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  if (loading) {
    return <div className="empty-state">Loading reports data...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Operations & Sales Analytics</h2>
          <p className="muted-text text-sm mt-2">Real-time statistics, revenue metrics, and metal demand graphs from dealer orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral"><FileText className="h-3.5 w-3.5 mr-1 inline" /> B2B Reports</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label">Total Revenue</p>
              <h3 className="metric-value mt-3 font-mono">₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            </div>
            <div className="icon-box">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="metric-subtext mt-3">Gross invoice value across all orders</p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label">Total Orders</p>
              <h3 className="metric-value mt-3 font-mono">{metrics.totalOrders}</h3>
            </div>
            <div className="icon-box">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="metric-subtext mt-3">Dealer invoices generated</p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label">Silver Dispatched</p>
              <h3 className="metric-value mt-3 font-mono">{(metrics.totalWeight / 1000).toFixed(2)} kg</h3>
            </div>
            <div className="icon-box">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="metric-subtext mt-3">Total fine weight of {metrics.totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}g</p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="metric-label">Avg Order Value</p>
              <h3 className="metric-value mt-3 font-mono">₹{metrics.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
            </div>
            <div className="icon-box">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="metric-subtext mt-3">Average gross per order placed</p>
        </div>
      </div>

      {/* Chart Visualizations Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="xl:col-span-2 enterprise-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h3 className="card-title">Gross Revenue Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Daily order intake value trend.</p>
            </div>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-[280px] w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${(value ?? 0).toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="sales" stroke="#111827" strokeWidth={3} dot={{ fill: '#111827', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No sales data available.</div>
            )}
          </div>
        </div>

        {/* Order Type Distribution Pie Chart */}
        <div className="enterprise-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h3 className="card-title">Order Type Breakdown</h3>
              <p className="text-xs text-gray-500 mt-1">Share of Ready Stock vs. Make-to-Order pieces.</p>
            </div>
            <PieChartIcon className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-[280px] w-full relative">
            {orders.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderTypeData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value ?? 0} pcs`, 'Quantity']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No distribution data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Selling Designs Bar Chart */}
        <div className="enterprise-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h3 className="card-title">Top 5 Design Codes</h3>
              <p className="text-xs text-gray-500 mt-1">Best selling designs by unit quantities.</p>
            </div>
            <BarChart2 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-[280px] w-full">
            {topDesignsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDesignsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value} pcs`, 'Quantity']} />
                  <Bar dataKey="quantity" fill="#111827" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No designs sales data available.</div>
            )}
          </div>
        </div>

        {/* Detailed Sales Breakdown Table */}
        <div className="xl:col-span-2 enterprise-panel overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h3 className="card-title">Sales Matrix by Product Code</h3>
            <p className="text-xs text-gray-500 mt-1">Detailed performance metrics per jewelry design.</p>
          </div>
          <div className="overflow-x-auto max-h-[290px] overflow-y-auto scrollbar-thin">
            <table className="enterprise-table text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Design Code</th>
                  <th className="text-center">Total Quantity</th>
                  <th className="text-center">Total Weight Sold</th>
                  <th className="text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {salesTableData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-gray-900 font-mono">{row.name}</td>
                    <td className="text-center font-semibold text-gray-700 font-mono">{row.qty} pcs</td>
                    <td className="text-center text-gray-600 font-mono">{row.weight.toFixed(2)}g</td>
                    <td className="text-right font-bold text-gray-900 font-mono">₹{row.revenue.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {salesTableData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-8">No order items logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
