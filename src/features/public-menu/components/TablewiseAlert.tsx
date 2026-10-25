import React from 'react';

interface TablewiseAlertProps {
  type: 'error' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const TablewiseAlert: React.FC<TablewiseAlertProps> = ({ type, children, className = '' }) => {
  const styles = {
    error: 'bg-[#F77272]/15 border-[#F77272] text-white',
    warning: 'bg-[#F5A623]/15 border-[#F5A623] text-white',
    info: 'bg-[#2FDBBC]/15 border-[#2FDBBC] text-white',
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-medium font-poppins shadow-sm transition-all ${styles[type]} ${className}`}
    >
      {children}
    </div>
  );
};
