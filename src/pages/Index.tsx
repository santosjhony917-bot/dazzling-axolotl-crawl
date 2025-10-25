import React from 'react';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
  // Este componente não deve mais ser o ponto de entrada principal.
  // Ele pode ser usado como um placeholder ou ser removido se não for mais necessário.
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecionamento de rota raiz corrigido. Se você está vendo isso, algo deu errado.</p>
    </div>
  );
};

export default Index;