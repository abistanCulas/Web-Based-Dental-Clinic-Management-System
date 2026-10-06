import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { Edit2, Trash2, Mail, Phone, MapPin, Package } from 'lucide-react';

const SupplierTable = ({ suppliers = [], onEdit, onDelete, loading }) => {
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

  if (suppliers.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
        <p className="text-base font-semibold text-gray-600">No suppliers registered</p>
        <p className="text-xs text-gray-400 mt-1">Click "Add New Supplier" to create your first supplier record.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <tr>
            <th className="px-4 py-3">Supplier / Company</th>
            <th className="px-4 py-3">Contact Person</th>
            <th className="px-4 py-3">Contact Information</th>
            <th className="px-4 py-3">Registration No.</th>
            <th className="px-4 py-3 text-center">Items Supplied</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
              <td className="px-4 py-3 font-semibold text-gray-900">
                {s.supplierName}
                {s.address && (
                  <div className="text-xs text-gray-400 font-normal flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {s.address}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-gray-700">{s.contactPerson}</td>
              <td className="px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{s.phone}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {s.registrationNumber || 'N/A'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg">
                  <Package className="w-3 h-3 text-gray-400" />
                  {s.inventoryItemCount || 0}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onEdit(s)}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100/70 transition-colors"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(s)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100/70 transition-colors"
                    title="Deactivate Supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierTable;
