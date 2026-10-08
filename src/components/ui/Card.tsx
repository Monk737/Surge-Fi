import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white border-2 border-black rounded-xl shadow-neo relative ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b-2 border-black bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-black uppercase tracking-tight flex items-center">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};