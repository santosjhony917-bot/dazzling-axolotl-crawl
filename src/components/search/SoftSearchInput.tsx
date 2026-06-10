import React from 'react';
import { Search } from 'lucide-react';

interface SoftSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSubmitAction?: (e: React.FormEvent) => void;
}

const SoftSearchInput: React.FC<SoftSearchInputProps> = ({ onSubmitAction, className, ...props }) => {
  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmitAction) onSubmitAction(e);
      }} 
      className={`bg-white soft-pill w-full h-[60px] flex items-center px-5 gap-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)] border border-slate-100/50 ${className || ''}`}
    >
      <Search className="w-6 h-6 text-[#3C2F2F] stroke-[2] flex-shrink-0" />
      <input
        {...props}
        className="flex-grow w-full h-full bg-transparent border-none outline-none text-[#3C2F2F] font-medium text-[16px] placeholder:text-[#6A6A6A]/60"
      />
    </form>
  );
};

export default SoftSearchInput;
