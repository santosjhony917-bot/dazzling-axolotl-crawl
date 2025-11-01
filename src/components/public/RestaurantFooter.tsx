import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RestaurantFooterProps {
  description?: string | null;
  createdAt: string;
}

const RestaurantFooter: React.FC<RestaurantFooterProps> = ({ description, createdAt }) => {
  const creationDate = new Date(createdAt);
  const formattedDate = format(creationDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <footer className="p-4 sm:p-6 bg-gray-50 border-t">
      {description && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Sobre o Restaurante</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{description}</p>
        </div>
      )}
      
      <p className="text-xs text-gray-400 text-center mt-4">
        Perfil criado em {formattedDate}.
      </p>
    </footer>
  );
};

export default RestaurantFooter;