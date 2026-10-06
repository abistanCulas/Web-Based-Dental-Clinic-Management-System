import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventoryApi';
import { supplierApi } from '../api/supplierApi';
import { useAuth } from '../context/AuthContext';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryForm from '../components/inventory/InventoryForm';
import StockUpdateModal from '../components/common/StockUpdateModal';
import NurseDispenseModal from '../components/common/NurseDispenseModal';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SearchBar from '../components/common/SearchBar';
import toast from 'react-hot-toast';
import { Plus, Filter, KeyRound, HeartHandshake } from 'lucide-react';

const InventoryPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isNurse = user?.role === 'NURSE';
  const isSupplier = user?.role === 'SUPPLIER';

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDisposeDialogOpen, setIsDisposeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [category, status]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;

      const response = await inventoryApi.getAllItems(params);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierApi.getActiveSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const handleCreateItem = async (data) => {
    setActionLoading(true);
    try {
      await inventoryApi.createItem(data);
      toast.success('Dental inventory item saved successfully!');
      setIsAddModalOpen(false);
      fetchItems();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save inventory item.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateItem = async (data) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await inventoryApi.updateItem(selectedItem.id, data);
      toast.success('Inventory item updated successfully!');
      setIsEditModalOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update item.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Nurse taking / dispensing items
  const handleDispenseItem = async (dispenseData) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await inventoryApi.dispenseItem(selectedItem.id, dispenseData);
      toast.success(`Successfully dispensed ${dispenseData.quantity} ${selectedItem.unit} for clinic use.`);
      setIsDispenseModalOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not dispense item.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Removing expired items (Nurse or Inventory Manager)
  const handleDisposeExpired = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await inventoryApi.disposeExpiredItem(selectedItem.id);
      toast.success(`Expired item "${selectedItem.itemName}" has been safely disposed.`);
      setIsDisposeDialogOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to dispose item.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStock = async (stockData) => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await inventoryApi.updateStock(selectedItem.id, stockData);
      toast.success('Stock quantity adjusted successfully!');
      setIsStockModalOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update stock quantity.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await inventoryApi.deleteItem(selectedItem.id);
      toast.success('Item deactivated from inventory.');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      toast.error('Failed to delete item.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dental Inventory Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isNurse
              ? 'Nurse Portal: View dental materials, dispense items for clinical use, and dispose expired stock.'
              : isSupplier
              ? 'Supplier Portal: View clinic stock levels and register/restock dental supplies (Key Authorization Required).'
              : 'Inventory Management: Monitor stock levels, track manufacture & expiry dates, and manage supplies.'}
          </p>
        </div>

        {/* Action Button: Hidden for Nurse, Key-prompted for Supplier */}
        {!isNurse && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary shadow-sm"
          >
            {isSupplier ? (
              <>
                <KeyRound className="w-4 h-4 mr-1.5 text-amber-300" /> Restock / Add Item (With Key)
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" /> Add New Dental Item
              </>
            )}
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by material or equipment name..."
        />

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field text-xs py-1.5 w-auto"
          >
            <option value="">All Categories</option>
            <option value="MATERIAL">Materials (Consumables)</option>
            <option value="EQUIPMENT">Equipment & Instruments</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field text-xs py-1.5 w-auto"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Inventory Table with Mfg/Exp dates & Role Actions */}
      <InventoryTable
        items={items}
        loading={loading}
        onEdit={(item) => {
          setSelectedItem(item);
          setIsEditModalOpen(true);
        }}
        onDelete={(item) => {
          setSelectedItem(item);
          setIsDeleteDialogOpen(true);
        }}
        onUpdateStock={(item) => {
          setSelectedItem(item);
          setIsStockModalOpen(true);
        }}
        onDispense={(item) => {
          setSelectedItem(item);
          setIsDispenseModalOpen(true);
        }}
        onDisposeExpired={(item) => {
          setSelectedItem(item);
          setIsDisposeDialogOpen(true);
        }}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isSupplier ? "Supplier Restock / Add Item" : "Add New Dental Material / Item"}
        size="lg"
      >
        <InventoryForm
          onSubmit={handleCreateItem}
          suppliers={suppliers}
          isLoading={actionLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Edit Inventory Item"
        size="lg"
      >
        {selectedItem && (
          <InventoryForm
            defaultValues={{
              itemName: selectedItem.itemName,
              category: selectedItem.category,
              description: selectedItem.description || '',
              unit: selectedItem.unit,
              quantity: selectedItem.quantity,
              minimumStockLevel: selectedItem.minimumStockLevel,
              unitPrice: selectedItem.unitPrice,
              manufactureDate: selectedItem.manufactureDate || '',
              expiryDate: selectedItem.expiryDate || '',
              supplierId: selectedItem.supplierId || '',
              supplierSecurityKey: '',
            }}
            onSubmit={handleUpdateItem}
            suppliers={suppliers}
            isLoading={actionLoading}
            isEditMode={true}
          />
        )}
      </Modal>

      {/* Nurse Dispense Modal (With Expired Item Blocker) */}
      <NurseDispenseModal
        isOpen={isDispenseModalOpen}
        onClose={() => {
          setIsDispenseModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleDispenseItem}
        isLoading={actionLoading}
      />

      {/* Stock Adjustment Modal */}
      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={handleUpdateStock}
        isLoading={actionLoading}
      />

      {/* Confirm Dispose Expired Dialog */}
      <ConfirmDialog
        isOpen={isDisposeDialogOpen}
        onClose={() => {
          setIsDisposeDialogOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleDisposeExpired}
        title="Dispose Expired Dental Material"
        message={`Are you sure you want to safely dispose and remove expired material "${selectedItem?.itemName}" (Expired: ${selectedItem?.expiryDate}) from clinic inventory?`}
        confirmText="Dispose Expired"
        confirmVariant="danger"
        loading={actionLoading}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleDeleteItem}
        title="Deactivate Inventory Item"
        message={`Are you sure you want to deactivate "${selectedItem?.itemName}"? This item will be archived.`}
        confirmText="Deactivate"
        loading={actionLoading}
      />
    </div>
  );
};

export default InventoryPage;
