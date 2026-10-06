import React from 'react';
import { useForm } from 'react-hook-form';
import { supplierValidation } from '../../utils/validators';
import { Loader2 } from 'lucide-react';

const SupplierForm = ({ onSubmit, defaultValues, isLoading, isEditMode = false }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      supplierName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      registrationNumber: '',
      status: 'ACTIVE',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Supplier / Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('supplierName', supplierValidation.supplierName)}
            className={`input-field ${errors.supplierName ? 'input-error' : ''}`}
            placeholder="e.g. MediDental Supplies Ltd"
          />
          {errors.supplierName && <p className="error-text">{errors.supplierName.message}</p>}
        </div>

        {/* Contact Person */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Contact Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('contactPerson', supplierValidation.contactPerson)}
            className={`input-field ${errors.contactPerson ? 'input-error' : ''}`}
            placeholder="e.g. Sunil Perera"
          />
          {errors.contactPerson && <p className="error-text">{errors.contactPerson.message}</p>}
        </div>

        {/* Status (Only in edit mode) */}
        {isEditMode && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="input-field">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...register('email', supplierValidation.email)}
            className={`input-field ${errors.email ? 'input-error' : ''}`}
            placeholder="e.g. contact@supplier.lk"
          />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Phone Number (10 digits) <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            maxLength={10}
            {...register('phone', supplierValidation.phone)}
            className={`input-field ${errors.phone ? 'input-error' : ''}`}
            placeholder="e.g. 0771234567"
          />
          {errors.phone && <p className="error-text">{errors.phone.message}</p>}
        </div>

        {/* Business Registration Number */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Business Reg. No.
          </label>
          <input
            type="text"
            {...register('registrationNumber')}
            className="input-field"
            placeholder="e.g. PV-123456 / REG-2024"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Business Address</label>
          <input
            type="text"
            {...register('address')}
            className="input-field"
            placeholder="e.g. 123 Galle Road, Colombo 03"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditMode ? 'Update Supplier' : 'Register Supplier'}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;
