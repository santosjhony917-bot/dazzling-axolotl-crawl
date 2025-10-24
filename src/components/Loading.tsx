import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7f8] p-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#022D68]" />
      <p className="mt-3 text-sm text-gray-600">Carregando...</p>
    </div>
  );
}