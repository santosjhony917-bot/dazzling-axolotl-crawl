import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Layout from '@/layouts/Layout';
import ProfilePage from '@/pages/restaurant-area/Profile'; // Corrigido o caminho de importação

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          
          {/* Rota para a área do restaurante */}
          <Route path="/restaurant-area/profile" element={<ProfilePage />} />
          
          {/* Adicione outras rotas aqui */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;