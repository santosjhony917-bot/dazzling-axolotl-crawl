import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// ... imports
// ... imports

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          {/* ... outras rotas */}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;