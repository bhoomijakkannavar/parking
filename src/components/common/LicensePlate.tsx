import React from 'react';

interface LicensePlateProps {
  plateNumber: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LicensePlate: React.FC<LicensePlateProps> = ({
  plateNumber,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 tracking-wider',
    md: 'text-sm px-2.5 py-1 tracking-widest font-bold',
    lg: 'text-base px-3.5 py-1.5 tracking-widest font-black',
  };

  return (
    <div
      className={`inline-flex items-center rounded-md border border-slate-900 bg-white font-mono shadow-xs select-none ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-center gap-1 border-r border-slate-200 pr-1.5 mr-1.5 text-[9px] font-sans font-bold text-blue-800 leading-none">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
        <span>IND</span>
      </div>
      <span className="text-slate-950 font-mono font-bold uppercase tracking-wider">{plateNumber}</span>
    </div>
  );
};
