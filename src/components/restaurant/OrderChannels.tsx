import React, { memo } from 'react';
import { MessageSquare, BookOpen, Receipt } from 'lucide-react';

const OrderChannels: React.FC = memo(() => {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-primary">Peça agora pelo seu canal favorito</h2>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-none border border-gray-200 cursor-pointer hover:shadow-none transition-shadow">
          <MessageSquare className="w-7 h-7 text-highlight" />
          <p className="text-xs font-semibold text-gray-700">WhatsApp</p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-none border border-gray-200 cursor-pointer hover:shadow-none transition-shadow">
          <BookOpen className="w-7 h-7 text-highlight" />
          <p className="text-xs font-semibold text-gray-700">iFood</p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-none border border-gray-200 cursor-pointer hover:shadow-none transition-shadow">
          <Receipt className="w-7 h-7 text-highlight" />
          <p className="text-xs font-semibold text-gray-700">Anota aí</p>
        </div>
      </div>
    </div>
  );
});

export default OrderChannels;