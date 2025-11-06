import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import FullMenuPage from './pages/FullMenuPage'; // Importar a nova página

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/restaurant/:restaurantId/menu" element={<FullMenuPage />} /> {/* Nova rota */}
        {/* Adicione outras rotas aqui, se houver */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;