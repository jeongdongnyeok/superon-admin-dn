import React from 'react';

interface StatusMessageProps {
  type?: 'error' | 'info' | 'success';
  message: string;
  className?: string;
}

const typeToClass: Record<string, string> = {
  error: 'text-red-500',
  info: 'text-blue-500',
  success: 'text-green-600',
};

const StatusMessage: React.FC<StatusMessageProps> = ({ type = 'info', message, className = '' }) => {
  if (!message) return null;
  return (
    <div className={`${typeToClass[type] || ''} mb-2 ${className}`}>{message}</div>
  );
};

export default StatusMessage;
