import React from 'react';
import { Utensils, MessageSquare, Globe } from 'lucide-react';

interface OrderChannelButtonProps {
  type: 'whatsapp' | 'ifood' | 'other';
  url: string;
}

const OrderChannelButton: React.FC<OrderChannelButtonProps> = ({ type, url }) => {
  if (!url) return null;

  let icon: React.ReactNode;
  let label: string;
  let iconClasses: string;

  switch (type) {
    case 'whatsapp':
      icon = <MessageSquare className="w-8 h-8 fill-green-600 text-green-600" />;
      label = 'WhatsApp';
      iconClasses = 'text-green-600';
      break;
    case 'ifood':
      // Using Utensils as a placeholder for iFood logo/icon
      icon = <Utensils className="w-8 h-8 text-red-600" />;
      label = 'iFood';
      iconClasses = 'text-red-600';
      break;
    case 'other':
      icon = <Globe className="w-8 h-8 text-[#022D68]" />;
      label = 'Site Próprio';
      iconClasses = 'text-[#022D68]';
      break;
    default:
      return null;
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center p-4 w-full h-28 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className={`mb-1 ${iconClasses}`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-800 text-center">{label}</span>
    </a>
  );
};

export default OrderChannelButton;