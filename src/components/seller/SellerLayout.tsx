import React, { useEffect, useState } from 'react';
import { Home, PlusCircle, ShoppingCart, Users, Package, LogOut, Menu, User, RefreshCw } from 'lucide-react';
import { useApp, PERMISSION_DENIED_MESSAGE } from '../../context/AppContext';
import { useSeller } from '../../context/SellerContext';
import { SellerModule } from '../../types';
import { ToastContainer } from '../common/ToastContainer';
import { SellerHomePage } from '../../pages/seller/SellerHomePage';
import { SellerNewSalePage } from '../../pages/seller/SellerNewSalePage';
import { SellerSalesPage } from '../../pages/seller/SellerSalesPage';
import { SellerClientsPage } from '../../pages/seller/SellerClientsPage';
import { SellerProductsPage } from '../../pages/seller/SellerProductsPage';

const NAV_ITEMS: Array<{ id: SellerModule; label: string; icon: React.ElementType }> = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'nova_venda', label: 'Nova venda', icon: PlusCircle },
  { id: 'minhas_vendas', label: 'Minhas vendas', icon: ShoppingCart },
  { id: 'meus_clientes', label: 'Meus clientes', icon: Users },
  { id: 'produtos', label: 'Produtos disponíveis', icon: Package },
];

// Layout exclusivo do vendedor: não importa nenhuma página administrativa.
export const SellerLayout: React.FC = () => {
  const { user, logout, addToast } = useApp();
  const { module, setModule, isLoading, loadError, refresh, data } = useSeller();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // URL digitada à mão (ex.: /financeiro): o app não tem rotas administrativas para o vendedor.
  useEffect(() => {
    if (window.location.pathname !== '/' || window.location.hash) {
      addToast('error', 'Acesso negado', PERMISSION_DENIED_MESSAGE);
      window.history.replaceState(null, '', '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (id: SellerModule) => {
    setModule(id);
    setIsMobileMenuOpen(false);
  };

  const renderModule = () => {
    if (isLoading && !data) {
      return (
        <div className="flex items-center justify-center py-24 text-sm text-slate-500 gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Carregando seus dados...
        </div>
      );
    }
    if (!data) {
      return (
        <div className="bg-white rounded-3xl border border-rose-100 p-8 text-center max-w-lg mx-auto mt-10">
          <p className="text-sm font-bold text-rose-700">Não foi possível carregar seus dados.</p>
          <p className="text-xs text-slate-500 mt-1">{loadError}</p>
          <button
            onClick={() => refresh()}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      );
    }
    switch (module) {
      case 'nova_venda':
        return <SellerNewSalePage />;
      case 'minhas_vendas':
        return <SellerSalesPage />;
      case 'meus_clientes':
        return <SellerClientsPage />;
      case 'produtos':
        return <SellerProductsPage />;
      default:
        return <SellerHomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex font-sans">
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#000000] text-white flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-3 border-b border-zinc-900">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
              <img src="/pyfar-logo.png" alt="PYFAR" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold tracking-wider text-lg text-white">PYFAR</span>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Área do Vendedor</p>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = module === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-zinc-900">
          <button
            onClick={logout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 p-3 sm:p-5 lg:p-6">
        <header className="bg-[#1e40af] text-white px-4 sm:px-6 py-3 shadow-md rounded-2xl mb-5 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
              title="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold truncate">{NAV_ITEMS.find(i => i.id === module)?.label}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="text-xs font-bold tracking-wider uppercase block">{user.name}</span>
              <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">Vendedor</span>
            </div>
          </div>
        </header>

        <div className="flex-1">{renderModule()}</div>
      </main>

      <ToastContainer />
    </div>
  );
};
