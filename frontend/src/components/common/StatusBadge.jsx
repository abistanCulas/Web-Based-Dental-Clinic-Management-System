import React from 'react';

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
    case 'DELIVERED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
          {status}
        </span>
      );
    case 'LOW_STOCK':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
          LOW STOCK
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500"></span>
          EXPIRED
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-500"></span>
          PENDING
        </span>
      );
    case 'INACTIVE':
    case 'CANCELLED':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-gray-400"></span>
          {status}
        </span>
      );
  }
};

export default StatusBadge;
