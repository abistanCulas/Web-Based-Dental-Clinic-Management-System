import React from 'react';
import { useForm } from 'react-hook-form';
import { stockUpdateValidation } from '../../utils/validators';
import Modal from './Modal';
import { Loader2, PackageCheck } from 'lucide-react';

const StockUpdateModal = ({ isOpen, onClose, item, onSubmit, isLoading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      quantity: item?.quantity || 0,
      reason: 'Stock count update',
    },
  });

  React.useEffect(() => {
    if (item) {
      reset({
        quantity: item.quantity,
        reason: '',
      });
    }
  }, [item, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Stock Quantity" size="sm">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">{item.itemName}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Current Stock: <strong>{item.quantity} {item.unit}</strong> | Min Level: <strong>{item.minimumStockLevel}</strong>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            New Quantity ({item.unit}) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register('quantity', stockUpdateValidation.quantity)}
            className={`input-field ${errors.quantity ? 'input-error' : ''}`}
            placeholder="0"
          />
          {errors.quantity && <p className="error-text">{errors.quantity.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Reason for Adjustment <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('reason', stockUpdateValidation.reason)}
            className={`input-field ${errors.reason ? 'input-error' : ''}`}
            placeholder="e.g. Received new stock / Clinic usage"
          />
          {errors.reason && <p className="error-text">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Quantity
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockUpdateModal;
