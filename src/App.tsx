import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { SellerProvider } from './context/SellerContext';
import { SellerLayout } from './components/seller/SellerLayout';
import { LoginPage } from './pages/LoginPage';

const MainRouter: React.FC = () => {
  const { isLoggedIn, isLoadingSession, accessRole } = useApp();

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Carregando seus dados...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Vendedor: layout próprio (sem nenhuma página administrativa). Admin: sistema completo.
  if (accessRole === 'vendedor') {
    return (
      <SellerProvider>
        <SellerLayout />
      </SellerProvider>
    );
  }

  if (accessRole !== 'admin') return null;

  return <AppLayout />;
};

export function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}

export default App;
