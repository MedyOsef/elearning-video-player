/**
 * Application principale - Configuration du routing
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Home } from '@/pages/Home';
import { Player } from '@/pages/Player';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player" element={<Player />} />
      </Routes>
      
      {/* Toast notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
