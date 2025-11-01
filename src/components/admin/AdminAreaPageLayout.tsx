import React from 'react';
import AdminAreaHeader from './AdminAreaHeader';

interface AdminAreaPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AdminAreaPageLayout: React.FC<AdminAreaPageLayoutProps> = ({ title, children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminAreaHeader title={title} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminAreaPageLayout;