import React from 'react';
import LegalContent from '@/components/LegalContent';

export default function Legal() {
  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="relative bg-background-light font-sans antialiased flex min-h-screen w-full max-w-md mx-auto flex-col border-x border-slate-200/60 overflow-x-hidden">
        <LegalContent />
      </div>
    </div>
  );
}