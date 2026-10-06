import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboardApi';
import { inventoryApi } from '../api/inventoryApi';
import {
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  Truck,
  ShoppingCart,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, lowStockRes, expiringRes] = await Promise.all([
        dashboardApi.getStats(),
        inventoryApi.getLowStockItems(),
        inventoryApi.getExpiringSoonItems(),
      ]);
      setStats(statsRes.data);
      setLowStockItems(lowStockRes.data);
      setExpiringItems(expiringRes.data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading clinic inventory overview..." />;
  }

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-200 tracking-wider uppercase">
            {currentDateStr}
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            Dental Inventory & Supplies Dashboard
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Monitor real-time dental materials, check minimum stock levels, track expiry dates, and manage vendor purchase orders.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Manage Inventory
          </button>
          <button
            onClick={() => navigate('/purchase-orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-800/80 hover:bg-blue-800 text-white rounded-xl text-xs font-bold border border-blue-600/50 transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" /> Purchase Orders
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Dental Items
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900">{stats?.totalItems || 0}</span>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/inventory?status=LOW_STOCK')}
          className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Low Stock Alerts (US03)
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600">{stats?.lowStockItems || 0}</span>
            <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
              Reorder needed <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
              Expiring Soon (&lt;30d)
            </span>
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-orange-600">
              {stats?.expiringSoonItems || 0}
            </span>
            <span className="text-xs font-bold text-orange-600 flex items-center gap-0.5">
              Check dates <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/inventory?status=EXPIRED')}
          className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Expired Items (US04)
            </span>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-red-600">{stats?.expiredItems || 0}</span>
            <span className="text-xs font-bold text-red-600 flex items-center gap-0.5">
              Disposal required <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Suppliers & PO summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/suppliers')}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50/50"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats?.totalSuppliers || 0}</div>
            <div className="text-xs text-gray-500 font-medium">Registered Dental Suppliers</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/suppliers')}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50/50"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats?.activeSuppliers || 0}</div>
            <div className="text-xs text-gray-500 font-medium">Active Partner Suppliers</div>
          </div>
        </div>

        <div
          onClick={() => navigate('/purchase-orders')}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50/50"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats?.pendingOrders || 0}</div>
            <div className="text-xs text-gray-500 font-medium">Pending Purchase Orders</div>
          </div>
        </div>
      </div>

      {/* Two Column Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Low Stock Attention List</h3>
            </div>
            <button
              onClick={() => navigate('/inventory?status=LOW_STOCK')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-gray-700">All materials well-stocked!</p>
              <p className="text-xs text-gray-400">No items are currently below minimum stock level.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{item.itemName}</h4>
                    <p className="text-[11px] text-gray-500">
                      Supplier: {item.supplierName || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-amber-600">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-[10px] text-gray-400 block">Min: {item.minimumStockLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Upcoming Expirations (&lt;30 Days)</h3>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {expiringItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-gray-700">No imminent expirations</p>
              <p className="text-xs text-gray-400">All materials have valid future expiry dates.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {expiringItems.slice(0, 5).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{item.itemName}</h4>
                    <p className="text-[11px] text-gray-500">
                      {item.quantity} {item.unit} available
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-orange-600 block">{item.expiryDate}</span>
                    <span className="text-[10px] text-gray-400">Expiring soon</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
