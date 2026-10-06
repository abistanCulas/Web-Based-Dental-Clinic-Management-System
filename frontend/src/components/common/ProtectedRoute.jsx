import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
          <h2 className="text-2xl font-bold">Access Denied</h2>
        </div>
        <p className="text-gray-600 max-w-md mb-6">
          You do not have the required permissions to access this page. Your role is: <strong>{user?.role}</strong>
        </p>
        <a href="/dashboard" className="btn-primary">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
