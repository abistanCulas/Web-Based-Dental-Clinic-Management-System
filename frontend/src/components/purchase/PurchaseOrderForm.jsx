import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { purchaseOrderValidation } from '../../utils/validators';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

const PurchaseOrderForm = ({ onSubmit, suppliers = [], inventoryItems = [], isLoading }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      supplierId: '',
      orderDate: todayStr,
      expectedDeliveryDate: '',
      notes: '',
      items: [{ inventoryItemId: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  // Calculate order total
  const totalAmount = (watchedItems || []).reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleItemChange = (index, itemId) => {
    const selected = inventoryItems.find((i) => String(i.id) === String(itemId));
    if (selected) {
      setValue(`items.${index}.unitPrice`, Number(selected.unitPrice));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier */}
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Supplier <span className="text-red-500">*</span>
          </label>
          <select
            {...register('supplierId', purchaseOrderValidation.supplierId)}
            className={`input-field ${errors.supplierId ? 'input-error' : ''}`}
          >
            <option value="">-- Choose Supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplierName}
              </option>
            ))}
          </select>
          {errors.supplierId && <p className="error-text">{errors.supplierId.message}</p>}
        </div>

        {/* Order Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Order Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('orderDate', purchaseOrderValidation.orderDate)}
            className={`input-field ${errors.orderDate ? 'input-error' : ''}`}
          />
          {errors.orderDate && <p className="error-text">{errors.orderDate.message}</p>}
        </div>

        {/* Expected Delivery Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Expected Delivery Date
          </label>
          <input
            type="date"
            {...register('expectedDeliveryDate', purchaseOrderValidation.expectedDeliveryDate)}
            className={`input-field ${errors.expectedDeliveryDate ? 'input-error' : ''}`}
          />
          {errors.expectedDeliveryDate && (
            <p className="error-text">{errors.expectedDeliveryDate.message}</p>
          )}
        </div>
      </div>

      {/* Items Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-gray-800">Order Items</h4>
          <button
            type="button"
            onClick={() => append({ inventoryItemId: '', quantity: 1, unitPrice: 0 })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Another Item
          </button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => {
            const currentItem = watchedItems?.[index];
            const subtotal = (Number(currentItem?.quantity) || 0) * (Number(currentItem?.unitPrice) || 0);

            return (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-center bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 text-xs"
              >
                <div className="col-span-5">
                  <select
                    {...register(`items.${index}.inventoryItemId`, {
                      required: 'Item required',
                    })}
                    onChange={(e) => {
                      register(`items.${index}.inventoryItemId`).onChange(e);
                      handleItemChange(index, e.target.value);
                    }}
                    className="input-field text-xs py-1.5"
                  >
                    <option value="">-- Select Material / Item --</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`, {
                      required: true,
                      min: 1,
                      valueAsNumber: true,
                    })}
                    className="input-field text-xs py-1.5 text-center"
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    {...register(`items.${index}.unitPrice`, {
                      required: true,
                      min: 0.01,
                      valueAsNumber: true,
                    })}
                    className="input-field text-xs py-1.5 text-right"
                  />
                </div>

                <div className="col-span-2 text-right font-bold text-gray-800 pr-1">
                  LKR {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </div>

                <div className="col-span-1 text-center">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="flex justify-end items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Estimated Amount:</span>
            <span className="text-base font-black text-gray-900 ml-2">
              LKR {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Order Notes / Delivery Instructions</label>
        <textarea
          {...register('notes')}
          rows="2"
          className="input-field"
          placeholder="Special instructions for the supplier, urgent delivery request, etc."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Place Purchase Order
        </button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;
