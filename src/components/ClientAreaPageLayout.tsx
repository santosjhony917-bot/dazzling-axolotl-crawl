import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';

interface ClientAreaPageLayoutProps {
  title: string;
  icon?: React.ElementType;
  backPath?: string;
  children: React.ReactNode;
}

const ClientAreaPageLayout: React.FC<ClientAreaPageLayoutProps> = ({
  title,
  icon,
  backPath,
  children,
}) => {
  const navigate = useNavigate();

  const leftAction = backPath ? {
    icon: ArrowLeft,
    onClick: () => navigate(backPath),
  } : undefined;

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      <Header title={title} leftAction={leftAction} />
      <main>{children}</main>
    </div>
  );
};

export default ClientAreaPageLayout;