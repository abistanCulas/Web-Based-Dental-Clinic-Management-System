import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Package,
  Truck,
  ShoppingCart,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isNurse = user?.role === 'NURSE';
  const isSupplier = user?.role === 'SUPPLIER';
  const isManagerOrAdmin = user?.role === 'INVENTORY_MANAGER' || user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-blue-800 text-white shadow-sm'
        : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
    }`;

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight block">DentaCare</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 block -mt-1">
                {isNurse ? 'Clinical Dispensing' : isSupplier ? 'Supplier Portal' : 'Inventory & Supplies'}
              </span>
            </div>
          </div>

          {/* Navigation Links (Tailored by Role) */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/inventory" className={navLinkClass}>
              <Package className="w-4 h-4" />
              <span>{isNurse ? 'Stock & Dispense' : 'Inventory Items'}</span>
            </NavLink>

            {/* Suppliers tab visible to Inventory Manager & Admin (Supplier Manager) */}
            {isManagerOrAdmin && (
              <NavLink to="/suppliers" className={navLinkClass}>
                <Truck className="w-4 h-4" />
                <span>Suppliers</span>
              </NavLink>
            )}

            {/* Purchase Orders visible to Manager & Admin */}
            {isManagerOrAdmin && (
              <NavLink to="/purchase-orders" className={navLinkClass}>
                <ShoppingCart className="w-4 h-4" />
                <span>Purchase Orders</span>
              </NavLink>
            )}
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-800/50">
              {isNurse ? (
                <HeartPulse className="w-4 h-4 text-pink-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <div className="text-left">
                <p className="text-xs font-bold leading-none text-white">{user?.username || 'User'}</p>
                <p className="text-[10px] text-blue-200 capitalize mt-0.5">
                  {user?.role?.replace('_', ' ')?.toLowerCase() || 'Staff'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-red-500/30"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
