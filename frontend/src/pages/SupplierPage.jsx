import React, { useState, useEffect } from 'react';
import { supplierApi } from '../api/supplierApi';
import SupplierTable from '../components/supplier/SupplierTable';
import SupplierForm from '../components/supplier/SupplierForm';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SearchBar from '../components/common/SearchBar';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await supplierApi.getAllSuppliers(search ? { search } : {});
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to load supplier records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (data) => {
    setActionLoading(true);
    try {
      await supplierApi.createSupplier(data);
      toast.success('Supplier registered successfully!');
      setIsAddModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save supplier.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSupplier = async (data) => {
    if (!selectedSupplier) return;
    setActionLoading(true);
    try {
      await supplierApi.updateSupplier(selectedSupplier.id, data);
      toast.success('Supplier information updated successfully!');
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update supplier.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    setActionLoading(true);
    try {
      await supplierApi.deleteSupplier(selectedSupplier.id);
      toast.success('Supplier status set to INACTIVE.');
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to deactivate supplier.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dental Supplier Records</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Maintain dental pharmaceutical vendors, equipment manufacturers, and contact info (US02).
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Supplier
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers by company or contact person..."
        />
      </div>

      <SupplierTable
        suppliers={suppliers}
        loading={loading}
        onEdit={(supplier) => {
          setSelectedSupplier(supplier);
          setIsEditModalOpen(true);
        }}
        onDelete={(supplier) => {
          setSelectedSupplier(supplier);
          setIsDeleteDialogOpen(true);
        }}
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Dental Supplier"
        size="md"
      >
        <SupplierForm onSubmit={handleCreateSupplier} isLoading={actionLoading} />
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSupplier(null);
        }}
        title="Edit Supplier Details"
        size="md"
      >
        {selectedSupplier && (
          <SupplierForm
            defaultValues={{
              supplierName: selectedSupplier.supplierName,
              contactPerson: selectedSupplier.contactPerson,
              email: selectedSupplier.email,
              phone: selectedSupplier.phone,
              address: selectedSupplier.address || '',
              registrationNumber: selectedSupplier.registrationNumber || '',
              status: selectedSupplier.status,
            }}
            onSubmit={handleUpdateSupplier}
            isLoading={actionLoading}
            isEditMode={true}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedSupplier(null);
        }}
        onConfirm={handleDeleteSupplier}
        title="Deactivate Supplier"
        message={`Are you sure you want to deactivate "${selectedSupplier?.supplierName}"? Existing purchase order history will remain intact.`}
        confirmText="Deactivate"
        loading={actionLoading}
      />
    </div>
  );
};

export default SupplierPage;
