"use client";

import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#022D68] text-white p-6 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <Link to="/" className="text-2xl font-bold">FoodApp</Link>
          <p className="text-sm mt-2">&copy; {new Date().getFullYear()} FoodApp. Todos os direitos reservados.</p>
        </div>
        <nav className="flex space-x-6">
          <Link to="/about" className="hover:text-[#E47948]">Sobre Nós</Link>
          <Link to="/contact" className="hover:text-[#E47948]">Contato</Link>
          <Link to="/legal" className="hover:text-[#E47948]">Política de Privacidade</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;