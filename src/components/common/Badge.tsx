import React from 'react';
import { VehicleType, OwnerCategory } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-[#E8F1EB] text-[#2F6043] border-[#E8F1EB]',
    warning: 'bg-[#FEF9E7] text-[#B7791F] border-[#FCE8B2]',
    danger: 'bg-[#FDF2F2] text-[#B45353] border-[#F8D7DA]',
    info: 'bg-[#F0F4F8] text-[#4F6B8A] border-[#D9E2EC]',
    indigo: 'bg-[#F7F8FA] text-[#1F2937] border-[#E5E7EB]',
    neutral: 'bg-[#F7F8FA] text-[#4B5563] border-[#E5E7EB]',
  };

  const sizeStyles = {
    sm: 'text-[11px] font-medium px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const VehicleTypeBadge: React.FC<{ type: VehicleType }> = ({ type }) => {
  if (type === 'TWO_WHEELER') {
    return (
      <Badge variant="neutral" size="sm">
        Two-Wheeler
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" size="sm">
      Four-Wheeler
    </Badge>
  );
};

export const OwnerCategoryBadge: React.FC<{ category: OwnerCategory }> = ({ category }) => {
  switch (category) {
    case 'STAFF':
      return (
        <Badge variant="success" size="sm">
          Staff
        </Badge>
      );
    case 'STUDENT':
      return (
        <Badge variant="info" size="sm">
          Student
        </Badge>
      );
    case 'VISITOR':
      return (
        <Badge variant="warning" size="sm">
          Visitor
        </Badge>
      );
    default:
      return <Badge variant="neutral" size="sm">{category}</Badge>;
  }
};
