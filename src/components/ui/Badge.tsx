import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const styles = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-600",
    warning: "bg-amber-100 text-amber-800 border-amber-600",
    danger: "bg-rose-100 text-rose-800 border-rose-600",
    neutral: "bg-gray-100 text-gray-800 border-gray-600"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border-2 ${styles[variant]}`}>
      {children}
    </span>
  );
};