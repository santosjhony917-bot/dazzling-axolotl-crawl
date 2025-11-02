import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Dashboard from './pages/restaurant/Dashboard'; // Importe o Dashboard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/restaurant/dashboard" element={<Dashboard />} /> {/* Adicione a rota para o Dashboard */}
      </Routes>
    </Router>
  );
}

export default App;