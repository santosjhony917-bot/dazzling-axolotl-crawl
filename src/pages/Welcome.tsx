import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

export default function Welcome() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <Logo className="h-12 w-auto" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Bem-vindo ao Achei!
            </h1>
            <p className="text-lg text-gray-600">
              Sua plataforma para encontrar e gerenciar os melhores restaurantes.
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <Button asChild size="lg">
              <Link to="/login">Acessar como Usuário</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/restaurant-login">Acessar como Restaurante</Link>
            </Button>
          </div>
        </div>
      </main>
      <footer className="py-4 px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Achei. Todos os direitos reservados.
      </footer>
    </div>
  );
}