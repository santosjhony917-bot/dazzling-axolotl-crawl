"use client";

import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Você pode adicionar um cabeçalho ou rodapé aqui se desejar */}
      <main className="flex-grow">
        <Outlet /> {/* Isso renderizará as rotas aninhadas */}
      </main>
    </div>
  );
};

export default Layout;