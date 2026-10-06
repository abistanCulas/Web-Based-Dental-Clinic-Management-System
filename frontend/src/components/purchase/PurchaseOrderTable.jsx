import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { CheckCircle2, XCircle, Trash2, Eye } from 'lucide-react';

const PurchaseOrderTable = ({ orders = [], onView, onStatusChange, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
        <p className="text-base font-semibold text-gray-600">No purchase orders found</p>
        <p className="text-xs text-gray-400 mt-1">Create a purchase order to order materials from suppliers.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <tr>
            <th className="px-4 py-3">PO #</th>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Order Date</th>
            <th className="px-4 py-3">Expected Date</th>
            <th className="px-4 py-3 text-right">Total Amount (LKR)</th>
            <th className="px-4 py-3 text-center">Items</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-blue-50/40 transition-colors">
              <td className="px-4 py-3 font-bold text-gray-900">PO-{String(order.id).padStart(4, '0')}</td>
              <td className="px-4 py-3 font-semibold text-gray-800">{order.supplierName}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{order.orderDate}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {order.expectedDeliveryDate || 'Immediate'}
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">
                {Number(order.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {order.items?.length || 0}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onView(order)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/70 transition-colors"
                    title="View Order Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => onStatusChange(order.id, 'DELIVERED')}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100/70 transition-colors"
                        title="Mark Delivered (Auto-restocks Inventory)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStatusChange(order.id, 'CANCELLED')}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100/70 transition-colors"
                        title="Cancel Order"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {order.status !== 'DELIVERED' && (
                    <button
                      onClick={() => onDelete(order)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-100/70 transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseOrderTable;
