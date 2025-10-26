import React from 'react';
import { useParams } from 'react-router-dom';

// Este arquivo foi renomeado de CategoryDetails.tsx.
// O conteúdo foi movido para MenuManagement.tsx (CategoryAccordion).

export default function MenuItemManagement() {
  const { categoryId } = useParams<{ categoryId: string }>();
  
  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold">Gerenciamento de Itens</h1>
      <p className="text-gray-600 mt-2">Esta funcionalidade foi movida para a tela principal de Cardápio e Categorias.</p>
      <p className="text-sm text-gray-500 mt-4">ID da Categoria: {categoryId}</p>
    </div>
  );
}