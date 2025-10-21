import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Layout from '@/layouts/Layout';
import CustomerProfilePage from '@/pages/Profile'; // Importa o perfil do usuário final
import RestaurantProfilePage from '@/pages/restaurant-area/Profile'; // Importa o perfil do restaurante

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          
          {/* Rota para o perfil do usuário final */}
          <Route path="/profile" element={<CustomerProfilePage />} />

          {/* Rota para a área do restaurante */}
          <Route path="/restaurant-area/profile" element={<RestaurantProfilePage />} />
          
          {/* Adicione outras rotas aqui */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;