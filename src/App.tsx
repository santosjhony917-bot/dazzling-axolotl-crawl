import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantProfile from './pages/restaurant/RestaurantProfile';
import MenuManagement from './pages/restaurant/MenuManagement'; // Importando o novo componente

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute />}>
          {/* Rota para o perfil do restaurante (assumindo que o ID é passado aqui) */}
          <Route path="/restaurant/:restaurantId/profile" element={<RestaurantProfile />} />
          
          {/* Rota para Gerenciamento de Menu - Deve aceitar o restaurantId */}
          <Route path="/restaurant/:restaurantId/menu" element={<MenuManagement />} />
        </Route>
        
        {/* Adicione outras rotas aqui */}
      </Routes>
    </Router>
  );
}

export default App;