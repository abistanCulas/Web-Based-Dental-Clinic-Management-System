import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';
import { Activity, Lock, User, Loader2, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: 'manager',
      password: 'password123',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await authApi.login(data);
      login(response.data);
      toast.success(`Welcome back, ${response.data.username} (${response.data.role})!`);
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid username or password. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleUser) => {
    setValue('username', roleUser);
    setValue('password', 'password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dental Clinic Management</h1>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">
            Supplies & Inventory Portal
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                {...register('username', { required: 'Username is required' })}
                className={`input-field pl-10 ${errors.username ? 'input-error' : ''}`}
                placeholder="Enter username"
              />
            </div>
            {errors.username && <p className="error-text">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className={`input-field pl-10 ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-sm font-bold mt-2 shadow-md"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign In to Dashboard
          </button>
        </form>

        {/* 1-CLICK DEMO ROLES */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Switch Clinic Role
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('manager')}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200 transition-colors text-center"
            >
              Inv. Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold rounded-lg border border-purple-200 transition-colors text-center"
            >
              Supplier Mgr
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('nurse')}
              className="py-1.5 px-2 bg-pink-50 hover:bg-pink-100 text-pink-800 text-[11px] font-bold rounded-lg border border-pink-200 transition-colors text-center"
            >
              Nurse
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('supplier')}
              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 transition-colors text-center"
            >
              Supplier
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('pharmacist')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition-colors text-center"
            >
              Pharmacist
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Password: <strong>password123</strong></p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Need an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
