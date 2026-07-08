import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, Search, Phone, Calendar, ShoppingBag, AlertCircle, Mail, UserCheck, UserPlus } from 'lucide-react';
import { API_BASE_URL } from '../context/AppContext';

interface CustomerData {
  id: number;
  name: string;
  mobile_number: string;
  email?: string | null;
  order_number?: string | null;
  created_at: string;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ordered' | 'registered'>('all');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    let list = customers;

    // Type filter
    if (filterType === 'ordered') {
      list = list.filter(c => !!c.order_number);
    } else if (filterType === 'registered') {
      list = list.filter(c => !!c.email && !c.order_number);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.mobile_number.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.order_number && c.order_number.toLowerCase().includes(query))
      );
    }

    return list;
  }, [customers, searchQuery, filterType]);

  const orderedCount = customers.filter(c => !!c.order_number).length;
  const registeredOnlyCount = customers.filter(c => !!c.email && !c.order_number).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Customer Directory</h2>
          <p className="muted-text text-sm mt-2">All registered customers and buyers who placed wholesale orders.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge-neutral"><Users className="h-3.5 w-3.5 mr-1 inline" /> {customers.length} Total</span>
          <span className="badge-success"><ShoppingBag className="h-3.5 w-3.5 mr-1 inline" /> {orderedCount} With Orders</span>
          <span className="badge-info"><UserPlus className="h-3.5 w-3.5 mr-1 inline" /> {registeredOnlyCount} Registered</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="table-toolbar flex-1">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search by name, mobile, email, or order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
            <Search className="h-4 w-4 search-icon" />
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50 shrink-0">
          {(['all', 'ordered', 'registered'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type === 'all' ? 'All' : type === 'ordered' ? 'Ordered' : 'Registered Only'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading customer directory...</div>
      ) : filteredCustomers.length > 0 ? (
        <div className="enterprise-panel overflow-hidden">
          <table className="enterprise-table text-sm">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Mobile Number</th>
                <th>Order Number</th>
                <th>Type</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{customer.name}</span>
                    </div>
                  </td>
                  <td>
                    {customer.email ? (
                      <div className="flex items-center space-x-1.5 text-gray-700">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{customer.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center space-x-1.5 font-semibold text-gray-700 font-mono">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{customer.mobile_number}</span>
                    </div>
                  </td>
                  <td>
                    {customer.order_number ? (
                      <div className="flex items-center space-x-1.5 font-bold text-gray-900 font-mono">
                        <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                        <span>{customer.order_number}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">No orders yet</span>
                    )}
                  </td>
                  <td>
                    {customer.email ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <UserCheck className="h-3 w-3" />
                        Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <ShoppingBag className="h-3 w-3" />
                        Order Only
                      </span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {new Date(customer.created_at).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="module-placeholder">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">No Customers Found</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Customers appear here when they register on the buyer page or place a wholesale order.
          </p>
        </div>
      )}
    </div>
  );
};
