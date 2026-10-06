export const supplierValidation = {
  supplierName: {
    required: 'Supplier name is required',
    minLength: { value: 2, message: 'Supplier name must be at least 2 characters' },
    maxLength: { value: 100, message: 'Supplier name cannot exceed 100 characters' },
  },
  contactPerson: {
    required: 'Contact person is required',
    minLength: { value: 2, message: 'Contact person must be at least 2 characters' },
    maxLength: { value: 100, message: 'Contact person cannot exceed 100 characters' },
  },
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/,
      message: 'Please enter a valid email address (e.g., info@medidental.lk)',
    },
  },
  phone: {
    required: 'Phone number is required',
    pattern: {
      value: /^[0-9]{10}$/,
      message: 'Phone number must be exactly 10 digits (e.g., 0771234567)',
    },
  },
};

export const inventoryValidation = {
  itemName: {
    required: 'Item name is required',
    minLength: { value: 2, message: 'Item name must be at least 2 characters' },
    maxLength: { value: 100, message: 'Item name cannot exceed 100 characters' },
  },
  category: {
    required: 'Category is required',
  },
  unit: {
    required: 'Unit of measurement is required (e.g., Box, Syringe, Piece)',
    maxLength: { value: 30, message: 'Unit cannot exceed 30 characters' },
  },
  quantity: {
    required: 'Quantity is required',
    min: { value: 0, message: 'Quantity cannot be negative' },
    valueAsNumber: true,
  },
  minimumStockLevel: {
    required: 'Minimum stock level is required for low-stock alerts',
    min: { value: 1, message: 'Minimum stock level must be at least 1' },
    valueAsNumber: true,
  },
  unitPrice: {
    required: 'Unit price is required',
    min: { value: 0.01, message: 'Unit price must be greater than 0' },
    valueAsNumber: true,
  },
  manufactureDate: {
    validate: (value) => {
      if (!value) return true;
      const selected = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return selected <= today || 'Manufacture date cannot be in the future.';
    },
  },
  expiryDate: {
    validate: (value, formValues) => {
      if (!value) return true;
      const selectedExp = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedExp < today) {
        return 'Expiry date cannot be in the past. Must be today or a future date.';
      }

      if (formValues?.manufactureDate) {
        const mfg = new Date(formValues.manufactureDate);
        if (selectedExp < mfg) {
          return 'Expiry date must be after manufacture date.';
        }
      }

      return true;
    },
  },
  supplierSecurityKey: {
    required: 'Supplier authorization key is required',
  },
};

export const stockUpdateValidation = {
  quantity: {
    required: 'Quantity is required',
    min: { value: 0, message: 'Cannot be negative' },
    valueAsNumber: true,
  },
  reason: {
    required: 'Reason is required (e.g., Stock In, Clinical Usage, Damaged, Disposed)',
    minLength: { value: 3, message: 'Reason must be at least 3 characters' },
  },
};

export const dispenseValidation = {
  quantity: {
    required: 'Please enter quantity to take',
    min: { value: 1, message: 'Must take at least 1 item' },
    valueAsNumber: true,
  },
  purpose: {
    required: 'Procedure or clinical purpose is required',
    minLength: { value: 3, message: 'Please describe purpose (e.g. Tooth Extraction, Filling Room 2)' },
  },
};

export const purchaseOrderValidation = {
  supplierId: {
    required: 'Please select a supplier',
  },
  orderDate: {
    required: 'Order date is required',
  },
  expectedDeliveryDate: {
    validate: (value, formValues) => {
      if (!value) return true;
      if (!formValues.orderDate) return true;
      return new Date(value) >= new Date(formValues.orderDate) || 'Expected delivery date cannot be before order date';
    },
  },
};
