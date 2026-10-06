import React, { useState, useEffect } from 'react';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { supplierApi } from '../api/supplierApi';
import { inventoryApi } from '../api/inventoryApi';
import PurchaseOrderTable from '../components/purchase/PurchaseOrderTable';
import PurchaseOrderForm from '../components/purchase/PurchaseOrderForm';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

const PurchaseOrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSuppliersAndItems();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrderApi.getAllOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersAndItems = async () => {
    try {
      const [suppRes, invRes] = await Promise.all([
        supplierApi.getActiveSuppliers(),
        inventoryApi.getAllItems(),
      ]);
      setSuppliers(suppRes.data);
      setInventoryItems(invRes.data);
    } catch (error) {
      console.error('Failed to load suppliers or items:', error);
    }
  };

  const handleCreateOrder = async (data) => {
    setActionLoading(true);
    try {
      await purchaseOrderApi.createOrder(data);
      toast.success('Purchase order created successfully!');
      setIsAddModalOpen(false);
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to place purchase order.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await purchaseOrderApi.updateOrderStatus(orderId, newStatus);
      if (newStatus === 'DELIVERED') {
        toast.success('Order marked as DELIVERED! Inventory stock has been automatically updated.');
      } else {
        toast.success(`Order status changed to ${newStatus}`);
      }
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not update order status.';
      toast.error(msg);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await purchaseOrderApi.deleteOrder(selectedOrder.id);
      toast.success('Purchase order deleted.');
      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete order.';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Procure dental materials from suppliers. Marking as "DELIVERED" automatically restocks inventory.
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Create Purchase Order
        </button>
      </div>

      <PurchaseOrderTable
        orders={orders}
        loading={loading}
        onView={(order) => {
          setSelectedOrder(order);
          setIsViewModalOpen(true);
        }}
        onStatusChange={handleStatusChange}
        onDelete={(order) => {
          setSelectedOrder(order);
          setIsDeleteDialogOpen(true);
        }}
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Dental Materials Purchase Order"
        size="lg"
      >
        <PurchaseOrderForm
          onSubmit={handleCreateOrder}
          suppliers={suppliers}
          inventoryItems={inventoryItems}
          isLoading={actionLoading}
        />
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedOrder(null);
        }}
        title={`Purchase Order: PO-${String(selectedOrder?.id || '').padStart(4, '0')}`}
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-gray-400 block font-semibold">SUPPLIER</span>
                <span className="font-bold text-gray-800 text-sm">{selectedOrder.supplierName}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">STATUS</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">ORDER DATE</span>
                <span className="font-bold text-gray-800">{selectedOrder.orderDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">EXPECTED DELIVERY</span>
                <span className="font-bold text-gray-800">
                  {selectedOrder.expectedDeliveryDate || 'Immediate'}
                </span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="text-xs text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <span className="font-bold block text-blue-900 mb-0.5">Order Notes:</span>
                {selectedOrder.notes}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Ordered Materials</h4>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-800">{item.itemName}</p>
                      <p className="text-gray-400">
                        {item.quantity} {item.unit} @ LKR {Number(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <div className="font-bold text-gray-900">
                      LKR {Number(item.subtotal).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 font-bold">
              <span className="text-xs text-gray-500 uppercase">Grand Total:</span>
              <span className="text-base text-gray-900">
                LKR {Number(selectedOrder.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={handleDeleteOrder}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order PO-${String(selectedOrder?.id || '').padStart(4, '0')}?`}
        confirmText="Delete Order"
        loading={actionLoading}
      />
    </div>
  );
};

export default PurchaseOrderPage;
