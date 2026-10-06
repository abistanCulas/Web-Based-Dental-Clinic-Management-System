import React from 'react';
import { useForm } from 'react-hook-form';
import { inventoryValidation } from '../../utils/validators';
import { useAuth } from '../../context/AuthContext';
import { Loader2, KeyRound, ShieldAlert } from 'lucide-react';

const InventoryForm = ({ onSubmit, defaultValues, suppliers = [], isLoading, isEditMode = false }) => {
  const { user } = useAuth();
  const isSupplierUser = user?.role === 'SUPPLIER';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      itemName: '',
      category: 'MATERIAL',
      description: '',
      unit: '',
      quantity: isSupplierUser ? 1 : 0,
      minimumStockLevel: 5,
      unitPrice: 0.0,
      manufactureDate: '',
      expiryDate: '',
      supplierId: '',
      supplierSecurityKey: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* SUPPLIER SECURITY KEY BANNER */}
      {isSupplierUser && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-amber-900">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h4 className="text-xs font-black uppercase tracking-wider">
              Supplier Security Authorization Required
            </h4>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Suppliers must provide the clinic-issued security authorization key to register or restock dental materials.
          </p>
          <div className="mt-3">
            <label className="block text-xs font-bold text-amber-900 mb-1">
              Security Passcode Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              {...register('supplierSecurityKey', inventoryValidation.supplierSecurityKey)}
              className={`input-field bg-white ${errors.supplierSecurityKey ? 'input-error' : ''}`}
              placeholder="Enter clinic supplier security key (Demo: DENTAL-SUPPLIER-KEY-2026)"
            />
            {errors.supplierSecurityKey && (
              <p className="error-text">{errors.supplierSecurityKey.message}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Item Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Dental Item / Material Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('itemName', inventoryValidation.itemName)}
            className={`input-field ${errors.itemName ? 'input-error' : ''}`}
            placeholder="e.g., Dental Composite Resin A2, Latex Examination Gloves"
          />
          {errors.itemName && <p className="error-text">{errors.itemName.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category', inventoryValidation.category)}
            className={`input-field ${errors.category ? 'input-error' : ''}`}
          >
            <option value="MATERIAL">Dental Material (Disposable / Consumable)</option>
            <option value="EQUIPMENT">Dental Equipment / Instrument</option>
          </select>
          {errors.category && <p className="error-text">{errors.category.message}</p>}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Unit of Measurement <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('unit', inventoryValidation.unit)}
            className={`input-field ${errors.unit ? 'input-error' : ''}`}
            placeholder="e.g., Box (50), Syringe, Pack, Piece"
          />
          {errors.unit && <p className="error-text">{errors.unit.message}</p>}
        </div>

        {/* Quantity (Supplier cannot add 0 or less than 0) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Quantity {isSupplierUser && <span className="text-blue-600">(Must be &gt; 0)</span>}{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={isSupplierUser ? 1 : 0}
            {...register('quantity', {
              ...inventoryValidation.quantity,
              min: isSupplierUser
                ? { value: 1, message: 'Supplier cannot add item with 0 or less than 0 quantity' }
                : { value: 0, message: 'Quantity cannot be negative' },
            })}
            className={`input-field ${errors.quantity ? 'input-error' : ''}`}
            placeholder={isSupplierUser ? '1' : '0'}
          />
          {errors.quantity && <p className="error-text">{errors.quantity.message}</p>}
        </div>

        {/* Minimum Stock Level */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Minimum Stock Level (Reorder Threshold) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register('minimumStockLevel', inventoryValidation.minimumStockLevel)}
            className={`input-field ${errors.minimumStockLevel ? 'input-error' : ''}`}
            placeholder="5"
          />
          {errors.minimumStockLevel && <p className="error-text">{errors.minimumStockLevel.message}</p>}
        </div>

        {/* Unit Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Unit Price (LKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('unitPrice', inventoryValidation.unitPrice)}
            className={`input-field ${errors.unitPrice ? 'input-error' : ''}`}
            placeholder="0.00"
          />
          {errors.unitPrice && <p className="error-text">{errors.unitPrice.message}</p>}
        </div>

        {/* Manufacture Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Manufacture Date (Mfg Date)
          </label>
          <input
            type="date"
            {...register('manufactureDate', inventoryValidation.manufactureDate)}
            className={`input-field ${errors.manufactureDate ? 'input-error' : ''}`}
          />
          {errors.manufactureDate && (
            <p className="error-text">{errors.manufactureDate.message}</p>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Expiry Date (Exp Date)
          </label>
          <input
            type="date"
            {...register('expiryDate', inventoryValidation.expiryDate)}
            className={`input-field ${errors.expiryDate ? 'input-error' : ''}`}
          />
          {errors.expiryDate && <p className="error-text">{errors.expiryDate.message}</p>}
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Assigned Supplier
          </label>
          <select {...register('supplierId')} className="input-field">
            <option value="">-- Select Supplier (Optional) --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplierName} ({s.contactPerson})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description / Clinical Notes
          </label>
          <textarea
            {...register('description')}
            rows="2"
            className="input-field"
            placeholder="Additional notes about storage condition, batch number, or clinical usage..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditMode ? 'Update Inventory Item' : 'Save Inventory Item'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
