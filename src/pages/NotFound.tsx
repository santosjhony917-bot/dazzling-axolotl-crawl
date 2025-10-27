import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils/url";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light p-4">
      <div className="text-center bg-white p-10 rounded-2xl shadow-soft-xl max-w-sm">
        <Frown className="w-16 h-16 text-highlight mx-auto mb-6" />
        <h1 className="text-5xl font-extrabold mb-4 text-primary">404</h1>
        <p className="text-xl text-gray-700 mb-6">Oops! Página não encontrada</p>
        <Button 
          asChild 
          variant="highlight"
          className="h-12 text-lg font-bold rounded-xl shadow-highlight-glow"
        >
          <a href={createPageUrl('home')}>
            Retornar ao Início
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;