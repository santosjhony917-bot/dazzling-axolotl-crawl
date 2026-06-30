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
      className={`flex h-12 w-full items-center gap-3 rounded-full border border-slate-100 bg-white px-4 shadow-soft ${className || ''}`}
    >
      <Search className="h-5 w-5 flex-shrink-0 text-highlight stroke-[2]" />
      <input
        {...props}
        className="h-full w-full flex-grow border-none bg-transparent text-[15px] font-normal text-[#3C2F2F] outline-none placeholder:text-text-secondary/70"
      />
    </form>
  );
};

export default SoftSearchInput;
