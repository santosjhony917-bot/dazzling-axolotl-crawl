import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

interface NavCardItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isLocked?: boolean;
  href: string;
  onClick?: () => void;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ icon, title, description, isLocked = false, href, onClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault(); // Impede a navegação se estiver bloqueado
      // Você pode adicionar um toast aqui para informar o usuário que é um recurso premium
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      to={href}
      onClick={handleClick}
      className={`flex items-center p-4 rounded-lg transition-colors ${isLocked ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
    >
      <div className="flex-shrink-0 mr-4">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-primary truncate">{title}</h3>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLocked ? "Exclusivo Premium" : description}
        </p>
      </div>
      {isLocked && (
        <Lock className="w-5 h-5 text-red-500 ml-4" />
      )}
    </Link>
  );
};

export default NavCardItem;