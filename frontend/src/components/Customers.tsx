import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, Search, Phone, Calendar, ShoppingBag, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../context/AppContext';

interface CustomerData {
  id: number;
  name: string;
  mobile_number: string;
  order_number: string;
  created_at: string;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.mobile_number.includes(query) ||
      c.order_number.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">B2B Customer Directory</h2>
          <p className="muted-text text-sm mt-2">View and manage jeweler information, contact details, and their associated order codes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral"><Users className="h-3.5 w-3.5 mr-1 inline" /> {customers.length} Jewellers</span>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-field">
          <input 
            type="text" 
            placeholder="Search by jeweler name, mobile, or order number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <Search className="h-4 w-4 search-icon" />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading customer directory...</div>
      ) : filteredCustomers.length > 0 ? (
        <div className="enterprise-panel overflow-hidden">
          <table className="enterprise-table text-sm">
            <thead>
              <tr>
                <th>Jeweller Name</th>
                <th>Mobile Number</th>
                <th>Linked Order Number</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-semibold text-gray-900">{customer.name}</td>
                  <td>
                    <div className="flex items-center space-x-1.5 font-semibold text-gray-700 font-mono">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{customer.mobile_number}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-1.5 font-bold text-gray-900 font-mono">
                      <ShoppingBag className="h-3.5 w-3.5 text-gray-400" />
                      <span>{customer.order_number}</span>
                    </div>
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
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">No Customers Logged</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Customer contact logs are automatically saved when wholesale orders are filed from the checkout cart.</p>
        </div>
      )}
    </div>
  );
};
