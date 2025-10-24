import React from 'react';
import { Link } from 'react-router-dom';

const Signup: React.FC = () => {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold text-primary mb-6">Cadastro de Usuário</h1>
      <p className="text-lg text-text-secondary mb-8">Página de Cadastro (Placeholder)</p>
      <Link to="/" className="text-accent hover:underline">Voltar para Index</Link>
    </div>
  );
};

export default Signup;