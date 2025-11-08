import React from 'react';
import Header from './Header';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
};

export default AppLayout;