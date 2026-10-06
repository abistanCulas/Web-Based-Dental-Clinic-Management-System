import React from 'react';
import { useForm } from 'react-hook-form';
import { dispenseValidation } from '../../utils/validators';
import Modal from './Modal';
import { AlertOctagon, HeartHandshake, Loader2 } from 'lucide-react';

const NurseDispenseModal = ({ isOpen, onClose, item, onSubmit, isLoading }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isExpired =
    item?.isExpired ||
    (item?.expiryDate && new Date(item.expiryDate) < today) ||
    item?.status === 'EXPIRED';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      quantity: 1,
      purpose: '',
    },
  });

  React.useEffect(() => {
    if (item) {
      reset({ quantity: 1, purpose: '' });
    }
  }, [item, reset]);

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nurse Dispensing / Take Item" size="sm">
      <div className="space-y-4">
        {/* Item Details Card */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm">{item.itemName}</h4>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
              {item.unit}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400 block">Available Stock:</span>
              <strong className="text-gray-900 text-sm">{item.quantity} {item.unit}</strong>
            </div>
            <div>
              <span className="text-gray-400 block">Expiry Date:</span>
              <strong className={isExpired ? 'text-red-600 font-bold' : 'text-gray-800'}>
                {item.expiryDate || 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        {/* CRITICAL NURSE VALIDATION BANNER: IF EXPIRED */}
        {isExpired ? (
          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl text-red-800 flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-black text-sm text-red-900">ITEM HAS EXPIRED!</h5>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                This dental material is past its expiration date (<strong>{item.expiryDate}</strong>).
                Clinical protocol <strong>prohibits dispensing or taking this item for patients</strong>.
              </p>
              <p className="text-[11px] text-red-600 font-semibold mt-2">
                * Please use the "Dispose Expired" action to safely remove it from the clinic shelf.
              </p>
            </div>
          </div>
        ) : (
          /* Normal Dispense Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity to Take ({item.unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={item.quantity}
                {...register('quantity', dispenseValidation.quantity)}
                className={`input-field ${errors.quantity ? 'input-error' : ''}`}
                placeholder="1"
              />
              {errors.quantity && <p className="error-text">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Procedure / Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('purpose', dispenseValidation.purpose)}
                className={`input-field ${errors.purpose ? 'input-error' : ''}`}
                placeholder="e.g., Root Canal Treatment Room 1, Cleaning"
              />
              {errors.purpose && <p className="error-text">{errors.purpose.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isLoading || item.quantity <= 0} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <HeartHandshake className="w-4 h-4 mr-1.5" />
                )}
                Confirm Take Item
              </button>
            </div>
          </form>
        )}

        {isExpired && (
          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NurseDispenseModal;
