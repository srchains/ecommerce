import React from 'react';
import { X, Send, Mail, Printer, Download } from 'lucide-react';
import { API_BASE_URL } from '../context/AppContext';

interface InvoiceModalProps {
  order: any;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const totalVal = order.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
  const gstVal = totalVal * 0.03;
  const baseVal = totalVal - gstVal;

  const getWhatsAppInvoiceMessage = () => {
    const pdfUrl = `${API_BASE_URL}/api/orders/invoice/${order.id}/pdf`;
    let msg = `*SR CHAINS - B2B INVOICE*\n`;
    msg += `*Order Code:* ${order.order_number}\n`;
    msg += `*Date:* ${new Date(order.order_date).toLocaleDateString('en-IN')}\n`;
    msg += `*Customer:* ${order.customer_name}\n`;
    msg += `*Mobile:* ${order.mobile_number}\n`;
    if (order.email) msg += `*Email:* ${order.email}\n`;
    msg += `\n*Items Details:*\n`;
    order.items.forEach((item: any, idx: number) => {
      msg += `${idx + 1}. ${item.design_code} | ${item.variant_code} | Size ${item.size}" | ${item.quantity} pcs @ ₹${item.price.toFixed(2)} = ₹${(item.price * item.quantity).toFixed(2)}\n`;
    });
    msg += `\n*Total Invoice Value:* ₹${totalVal.toLocaleString('en-IN')}\n`;
    msg += `*Download PDF Invoice:* ${pdfUrl}\n\n`;
    msg += `Thank you for doing business with SR Chains!`;
    return encodeURIComponent(msg);
  };

  const getEmailSubject = () => {
    return encodeURIComponent(`Invoice for Order ${order.order_number} - SR Chains`);
  };

  const getEmailBody = () => {
    const pdfUrl = `${API_BASE_URL}/api/orders/invoice/${order.id}/pdf`;
    let body = `Dear ${order.customer_name},\n\nPlease find below the invoice for your order ${order.order_number} at SR Chains.\n\n`;
    body += `Order Details:\n`;
    body += `- Order Code: ${order.order_number}\n`;
    body += `- Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n`;
    body += `- Customer Name: ${order.customer_name}\n`;
    body += `- Mobile: ${order.mobile_number}\n`;
    if (order.email) body += `- Email: ${order.email}\n\n`;
    body += `Items List:\n`;
    order.items.forEach((item: any, idx: number) => {
      body += `${idx + 1}. ${item.design_code} - ${item.variant_code} - Size ${item.size}" - ${item.quantity} pcs @ Rs. ${item.price.toFixed(2)} = Rs. ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    body += `\nBase Price: Rs. ${baseVal.toLocaleString('en-IN')}\n`;
    body += `GST (3%): Rs. ${gstVal.toLocaleString('en-IN')}\n`;
    body += `Total Invoice Value: Rs. ${totalVal.toLocaleString('en-IN')}\n`;
    body += `Download PDF Invoice: ${pdfUrl}\n\n`;
    body += `Thank you for your order!\n\nBest regards,\nSR Chains Team`;
    return encodeURIComponent(body);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">B2B Invoice Bill</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Content */}
        <div id="printable-invoice" className="flex-1 overflow-y-auto p-6 space-y-6 select-text text-sm">
          {/* SR Chains Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <img src="/logo.jpg" alt="SR Chains" className="h-9 w-9 rounded-md object-cover" />
                <div>
                  <h1 className="text-lg font-bold tracking-wider text-gray-900">SR CHAINS</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Premium Silver Anklets Manufacturer</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2.5 max-w-xs leading-relaxed">
                64, Arumuga Pillayar Koil Street, Gugai, Salem - 636 005<br/>
                Ph: +91 70106 74487 | srchains19@gmail.com
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">INVOICE</h2>
              <p className="text-xs font-mono font-bold text-gray-700 mt-1">{order.order_number}</p>
              <p className="text-xs text-gray-500 mt-1">Date: {new Date(order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="mt-2.5">
                <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {order.status}
                </span>
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs">
            <div>
              <p className="text-gray-400 font-semibold uppercase tracking-wider">Billed To</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{order.customer_name}</p>
              <p className="text-gray-600 mt-1 font-mono">{order.mobile_number}</p>
              {order.email && <p className="text-gray-600 font-mono mt-0.5">{order.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-semibold uppercase tracking-wider">Payment Status</p>
              <p className="text-sm font-bold text-green-700 mt-1">Cash on Delivery / Dealer Terms</p>
              <p className="text-gray-500 mt-1">Due: Immediate upon dispatch</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5">Item Details</th>
                  <th className="py-2.5 text-center">Size</th>
                  <th className="py-2.5 text-right">Weight</th>
                  <th className="py-2.5 text-right">Price</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 text-gray-900">
                    <td className="py-3">
                      <span className="font-semibold block">{item.design_code}</span>
                      <span className="text-xs text-gray-500">{item.variant_code}</span>
                    </td>
                    <td className="py-3 text-center font-mono">{item.size}&quot;</td>
                    <td className="py-3 text-right font-mono">{item.weight.toFixed(2)}g</td>
                    <td className="py-3 text-right font-mono">₹{item.price.toFixed(2)}</td>
                    <td className="py-3 text-center font-semibold font-mono">{item.quantity}</td>
                    <td className="py-3 text-right font-bold font-mono">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal (Base Value)</span>
                <span className="font-mono font-semibold">₹{baseVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>GST (3%)</span>
                <span className="font-mono font-semibold">₹{gstVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2.5">
                <span>Invoice Total</span>
                <span className="font-mono text-gray-900">₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Actions) */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-wrap gap-3 justify-between shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

            <a
              href={`${API_BASE_URL}/api/orders/invoice/${order.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </a>
          </div>

          <div className="flex space-x-2">
            <a
              href={`https://api.whatsapp.com/send?phone=91${order.mobile_number}&text=${getWhatsAppInvoiceMessage()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>Send WhatsApp</span>
            </a>

            {order.email ? (
              <a
                href={`mailto:${order.email}?subject=${getEmailSubject()}&body=${getEmailBody()}`}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                <Mail className="h-4 w-4" />
                <span>Send Email</span>
              </a>
            ) : (
              <button
                disabled
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-400 font-semibold rounded-xl text-xs cursor-not-allowed shadow-xs"
                title="No email saved for this customer"
              >
                <Mail className="h-4 w-4" />
                <span>No Email Saved</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS styling override for print mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
