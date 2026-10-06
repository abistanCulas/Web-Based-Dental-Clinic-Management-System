import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  Edit2,
  Trash2,
  Sliders,
  AlertTriangle,
  Clock,
  HeartHandshake,
  AlertOctagon,
  Calendar,
} from 'lucide-react';

const InventoryTable = ({
  items = [],
  onEdit,
  onDelete,
  onUpdateStock,
  onDispense,
  onDisposeExpired,
  loading,
}) => {
  const { user } = useAuth();
  const isNurse = user?.role === 'NURSE';
  const isSupplier = user?.role === 'SUPPLIER';
  const isManagerOrAdmin = user?.role === 'INVENTORY_MANAGER' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
        <p className="text-base font-semibold text-gray-600">No inventory items found</p>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <tr>
            <th className="px-4 py-3">Dental Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-center">Stock Level</th>
            <th className="px-4 py-3 text-right">Price (LKR)</th>
            <th className="px-4 py-3">Mfg Date</th>
            <th className="px-4 py-3">Exp Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
              {/* Item Name */}
              <td className="px-4 py-3 font-medium text-gray-900">
                <div className="font-semibold text-gray-900">{item.itemName}</div>
                <div className="text-[11px] text-gray-400">
                  Supplier: {item.supplierName || 'Unassigned'}
                </div>
              </td>

              {/* Category */}
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    item.category === 'MATERIAL'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {item.category}
                </span>
              </td>

              {/* Quantity */}
              <td className="px-4 py-3 text-center">
                <div className="font-bold text-gray-800">
                  {item.quantity} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                </div>
                <div className="text-[11px] text-gray-400">Min: {item.minimumStockLevel}</div>
                {item.isLowStock && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                    <AlertTriangle className="w-3 h-3" /> Reorder
                  </span>
                )}
              </td>

              {/* Unit Price */}
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                {Number(item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </td>

              {/* Manufacture Date */}
              <td className="px-4 py-3 text-xs text-gray-600">
                {item.manufactureDate ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {item.manufactureDate}
                  </span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>

              {/* Expiry Date */}
              <td className="px-4 py-3">
                {item.expiryDate ? (
                  <div>
                    <span
                      className={`text-xs font-medium ${
                        item.isExpired
                          ? 'text-red-600 font-black flex items-center gap-1'
                          : item.isExpiringSoon
                          ? 'text-amber-600 font-bold flex items-center gap-1'
                          : 'text-gray-700 flex items-center gap-1'
                      }`}
                    >
                      {item.isExpiringSoon && <Clock className="w-3 h-3" />}
                      {item.isExpired && <AlertOctagon className="w-3 h-3 text-red-600" />}
                      {item.expiryDate}
                    </span>
                    {item.isExpired && (
                      <span className="block text-[10px] text-red-600 font-black uppercase tracking-wider">
                        EXPIRED
                      </span>
                    )}
                    {item.isExpiringSoon && !item.isExpired && (
                      <span className="block text-[10px] text-amber-500 font-semibold">
                        Expiring &lt;30d
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">N/A</span>
                )}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>

              {/* Actions Based on User Role */}
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {/* NURSE ACTION: Dispense / Take Item */}
                  {isNurse && (
                    <>
                      <button
                        onClick={() => onDispense(item)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
                          item.isExpired
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        title={item.isExpired ? 'Item is EXPIRED - Cannot take' : 'Take Item for Clinic Use'}
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Take</span>
                      </button>

                      {/* Nurse can remove item when it expires */}
                      {item.isExpired && (
                        <button
                          onClick={() => onDisposeExpired(item)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                          title="Dispose Expired Item from Shelf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}

                  {/* MANAGER & ADMIN ACTIONS */}
                  {isManagerOrAdmin && (
                    <>
                      <button
                        onClick={() => onUpdateStock(item)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/70 transition-colors"
                        title="Stock Count Adjustment"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100/70 transition-colors"
                        title="Edit Item Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {item.isExpired && (
                        <button
                          onClick={() => onDisposeExpired(item)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                          title="Remove Expired Item"
                        >
                          <AlertOctagon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-100/70 transition-colors"
                        title="Delete / Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* SUPPLIER ACTIONS: Can view and edit with key */}
                  {isSupplier && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Update item (Security key required)"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Update</span>
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

export default InventoryTable;
