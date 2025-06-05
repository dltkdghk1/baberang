import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-[#F8F1E7] rounded-3xl shadow-lg overflow-hidden flex flex-col ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

export const CardHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-white/50 ${className}`}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`p-6 flex-grow ${className}`}>{children}</div>;
};
