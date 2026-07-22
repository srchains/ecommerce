import React, { useState, useEffect, useMemo } from 'react';
import { useApp, API_BASE_URL } from '../context/AppContext';
import { 
  ClipboardList, 
  User, 
  Phone, 
  Trash2, 
  Check, 
  Plus, 
  Minus, 
  PlusCircle, 
  Info,
  Calendar
} from 'lucide-react';
import axios from 'axios';

interface WorkerOrderData {
  id: number;
  customer_name: string;
  mobile_number: string | null;
  variant_size_id: number;
  quantity: number;
  status: string;
  created_at: string;
  variant_size?: {
    id: number;
    variant_id: number;
    size: number;
    weight: number;
    stock_available: number;
    stock_reserved: number;
  };
}

export const WorkerOrders: React.FC = () => {
  const { designs, fetchDesigns } = useApp();
  const [orders, setOrders] = useState<WorkerOrderData[]>([]);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Completed'>('Pending');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Form states for adding order
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [selectedDesignId, setSelectedDesignId] = useState<number | ''>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [selectedSizeId, setSelectedSizeId] = useState<number | ''>('');
  const [orderQty, setOrderQty] = useState(1);

  // Fetch all worker orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products/worker-orders`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching worker orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter designs, variants, and sizes for dropdowns
  const activeDesign = useMemo(() => {
    if (!selectedDesignId) return null;
    return designs.find(d => d.id === selectedDesignId) || null;
  }, [selectedDesignId, designs]);

  const activeVariant = useMemo(() => {
    if (!activeDesign || !selectedVariantId) return null;
    return activeDesign.variants.find(v => v.id === selectedVariantId) || null;
  }, [selectedVariantId, activeDesign]);

  const handleDesignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : '';
    setSelectedDesignId(val);
    setSelectedVariantId('');
    setSelectedSizeId('');
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : '';
    setSelectedVariantId(val);
    setSelectedSizeId('');
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value) : '';
    setSelectedSizeId(val);
  };

  // Submit new worker order
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !selectedSizeId) {
      alert('Please fill in Customer Name and select a Size.');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/products/worker-orders`, {
        customer_name: custName,
        mobile_number: custPhone || null,
        variant_size_id: selectedSizeId,
        quantity: orderQty
      });

      setCustName('');
      setCustPhone('');
      setSelectedDesignId('');
      setSelectedVariantId('');
      setSelectedSizeId('');
      setOrderQty(1);

      setMsg('Worker order added successfully');
      fetchOrders();
      fetchDesigns(); // refresh inventory stock counts
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error creating worker order');
    }
  };

  // Adjust order quantity (+ or -)
  const handleAdjustQty = async (orderId: number, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;

    try {
      await axios.put(`${API_BASE_URL}/api/products/worker-orders/${orderId}`, {
        new_quantity: newQty
      });
      fetchOrders();
      fetchDesigns();
    } catch (err) {
      console.error('Error adjusting quantity:', err);
    }
  };

  // Fulfill/Complete order
  const handleCompleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to complete this order? This will deduct the physical stock.')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/products/worker-orders/${orderId}/complete`);
      setMsg('Order fulfilled and stock updated successfully');
      fetchOrders();
      fetchDesigns();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error('Error completing order:', err);
    }
  };

  // Cancel/Delete order
  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete/cancel this order reservation?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/products/worker-orders/${orderId}`);
      setMsg('Order cancelled and reservation released');
      fetchOrders();
      fetchDesigns();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  // Helper: find design and variant details for an order
  const getOrderDetails = (variantSizeId: number) => {
    for (const d of designs) {
      for (const v of d.variants) {
        const s = v.sizes.find(sz => sz.id === variantSizeId);
        if (s) {
          return {
            design_name: d.name,
            design_code: d.design_code,
            variant_name: v.variant_name,
            variant_code: v.variant_code,
            size: s.size,
            weight: s.weight
          };
        }
      }
    }
    return null;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.status === activeTab);
  }, [orders, activeTab]);

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Worker Order Reservations</h2>
          <p className="muted-text text-sm mt-2">Log, edit, and fulfill orders collected manually from buyer shops by sales workers.</p>
        </div>
        <span className="badge-neutral flex items-center"><ClipboardList className="h-3.5 w-3.5 mr-1" /> {orders.filter(o=>o.status==='Pending').length} Pending</span>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center space-x-2 font-medium">
          <Check className="h-4.5 w-4.5" />
          <span>{msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form to enter new manual order */}
        <div className="lg:col-span-1 space-y-4">
          <div className="enterprise-panel p-5 bg-white border border-gray-200 rounded-xl shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-600 mr-2" />
              <span>New Shop Order Reservation</span>
            </h3>
            
            <form onSubmit={handleAddOrder} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Customer Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Enter customer name..." 
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    className="input pl-8"
                    required
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Mobile Number (Optional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Enter mobile..." 
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    className="input pl-8"
                  />
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Select Design</label>
                <select value={selectedDesignId} onChange={handleDesignChange} className="input">
                  <option value="">-- Choose Design --</option>
                  {designs.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.design_code})</option>
                  ))}
                </select>
              </div>

              {selectedDesignId && activeDesign && (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Select Variant</label>
                  <select value={selectedVariantId} onChange={handleVariantChange} className="input">
                    <option value="">-- Choose Variant --</option>
                    {activeDesign.variants.map(v => (
                      <option key={v.id} value={v.id}>{v.variant_name} ({v.variant_code})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedVariantId && activeVariant && (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Select Size</label>
                  <select value={selectedSizeId} onChange={handleSizeChange} className="input">
                    <option value="">-- Choose Size --</option>
                    {activeVariant.sizes.map(s => {
                      const av = s.stock_available - (s.stock_reserved || 0);
                      return (
                        <option key={s.id} value={s.id}>
                          Size: {s.size.toFixed(2)}" - {s.weight.toFixed(2)}g (Avail: {av} pcs)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Order Quantity</label>
                <div className="qty-control h-[36px] w-full">
                  <button type="button" onClick={() => setOrderQty(prev => Math.max(1, prev - 1))}>-</button>
                  <span>{orderQty}</span>
                  <button type="button" onClick={() => setOrderQty(prev => prev + 1)}>+</button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-2.5 cursor-pointer text-xs mt-2">
                Create Reservation
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of orders */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
                activeTab === 'Pending' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Reservations
            </button>
            <button
              onClick={() => setActiveTab('Completed')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
                activeTab === 'Completed' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Fulfillment History
            </button>
          </div>

          {loading ? (
            <div className="empty-state">Loading order list...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">No {activeTab.toLowerCase()} orders found.</div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const details = getOrderDetails(order.variant_size_id);
                if (!details) return null;

                return (
                  <div key={order.id} className="enterprise-panel p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-extrabold text-gray-900">{order.customer_name}</h4>
                        {order.mobile_number && (
                          <p className="text-xs text-gray-500 font-medium flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1 inline" /> {order.mobile_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-400 font-medium flex items-center">
                        <Calendar className="h-3 w-3 mr-1 inline" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-150 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Design Code</span>
                        <span className="font-semibold text-gray-900">{details.design_code} ({details.design_name})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Variant & Details</span>
                        <span className="font-semibold text-gray-900">
                          {details.variant_name} — Size: {details.size.toFixed(2)}" ({details.weight.toFixed(2)}g)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-700">Reserved Pcs:</span>
                        {order.status === 'Pending' ? (
                          <div className="qty-control h-[28px] w-24 text-xs bg-white">
                            <button type="button" onClick={() => handleAdjustQty(order.id, order.quantity, -1)}>-</button>
                            <span className="font-bold font-mono">{order.quantity}</span>
                            <button type="button" onClick={() => handleAdjustQty(order.id, order.quantity, 1)}>+</button>
                          </div>
                        ) : (
                          <span className="font-bold font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{order.quantity} pcs</span>
                        )}
                      </div>

                      {order.status === 'Pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCompleteOrder(order.id)}
                            className="bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all font-bold px-3 py-1.5 rounded-lg flex items-center cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Mark Fulfled
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all p-1.5 rounded-lg cursor-pointer"
                            title="Cancel Order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      
                      {order.status === 'Completed' && (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          ✓ Fulfilled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
