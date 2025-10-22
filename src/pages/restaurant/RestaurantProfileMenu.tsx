import { ChevronRight, LogOut, User, Bell, Shield, Star, HelpCircle, FileText, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const RestaurantProfileMenu = () => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <div className="p-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">Nome do Restaurante</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ver e editar perfil</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Notificações</span><ChevronRight className="h-4 w-4 text-gray-400" /></a>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Segurança</span><ChevronRight className="h-4 w-4 text-gray-400" /></a>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Avalie-nos na sua loja de apps</span><ChevronRight className="h-4 w-4 text-gray-400" /></a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <Link to="/restaurant-area/help" className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"><span className="text-sm">Central de Ajuda</span></Link>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Falar com o Suporte</span></a>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Termos e Política de Privacidade</span></a>
              <div className="p-4">
                <button className="w-full text-left text-red-500 dark:text-red-400 text-sm">
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfileMenu;