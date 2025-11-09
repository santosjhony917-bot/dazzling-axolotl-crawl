"use client";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestaurantAreaPageLayoutProps {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
}

export function RestaurantAreaPageLayout({
  children,
  title,
  showBackButton = true,
}: RestaurantAreaPageLayoutProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Usa navigate(-1) para voltar à página anterior
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackClick}
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
            {/* Adicione outros elementos do cabeçalho aqui, se necessário */}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}