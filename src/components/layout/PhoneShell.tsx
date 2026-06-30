import React from 'react';
import { cn } from '@/lib/utils';

interface PhoneShellProps {
  children: React.ReactNode;
  className?: string;
  shellClassName?: string;
}

const PhoneShell: React.FC<PhoneShellProps> = ({ children, className, shellClassName }) => {
  return (
    <div className={cn("min-h-screen bg-[#f1f5f9] w-full flex flex-col", className)}>
      <div className={cn("app-phone-shell", shellClassName)}>
        {children}
      </div>
    </div>
  );
};

export default PhoneShell;
