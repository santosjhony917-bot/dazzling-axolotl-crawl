"use client"

import React from 'react'

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full">
      {/* Um layout adequado teria um cabeçalho, rodapé, etc. */}
      {/* Por enquanto, apenas renderiza os filhos para corrigir o erro de importação. */}
      {children}
    </div>
  )
}