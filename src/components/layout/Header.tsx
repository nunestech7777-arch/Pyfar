import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Menu, 
  Plus, 
  User, 
  Settings, 
  LogOut, 
  Sparkles,
  PackagePlus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { 
    user, 
    logout, 
    setCurrentModule, 
    globalSearch, 
    setGlobalSearch,
    sales,
    batches
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Notifications calculation
  const overdueSales = sales.filter(s => s.status === 'atrasado');
  const lowStockBatches = batches.filter(b => b.currentQuantity <= 30);
  const totalNotifs = overdueSales.length + lowStockBatches.length;

  return (
    <header className="bg-brand-blue bg-[#1e40af] text-white px-4 sm:px-6 py-3 shadow-md rounded-2xl mb-5 flex items-center justify-between gap-4 transition-all no-print">
      {/* Left side: Hamburger (mobile) + Search Pill */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar matching reference image style */}
        <div className="relative flex-1">
          <div className="flex items-center bg-blue-700/50 hover:bg-blue-700/70 focus-within:bg-blue-800/80 border border-blue-400/40 rounded-full px-3.5 py-2 transition-all w-full">
            <Search className="w-4 h-4 text-blue-200 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Buscar produtos, clientes, lotes, vendas..."
              className="bg-transparent text-sm text-white placeholder-blue-200/70 focus:outline-none w-full"
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch('')}
                className="text-xs text-blue-200 hover:text-white ml-1 px-1.5 py-0.5 rounded-full bg-blue-800/60"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Quick Shortcuts + Notifications + User Pill */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action: Nova Entrada */}
        <button
          onClick={() => setCurrentModule('entrada_estoque')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-700/60 hover:bg-blue-700 border border-blue-400/30 text-xs font-semibold text-white transition-all active:scale-95"
          title="Registrar nova compra / entrada de estoque"
        >
          <PackagePlus className="w-3.5 h-3.5 text-blue-200" />
          <span>+ Entrada Estoque</span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-full hover:bg-blue-700/60 text-blue-100 hover:text-white relative transition-colors"
            title="Notificações e Avisos"
          >
            <Bell className="w-5 h-5" />
            {totalNotifs > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 border-2 border-blue-800 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="font-bold text-sm text-slate-900">Avisos do Sistema</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {totalNotifs} pendência(s)
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {overdueSales.length === 0 && lowStockBatches.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">Nenhum aviso urgente no momento.</p>
                ) : (
                  <>
                    {overdueSales.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => {
                          setCurrentModule('contas_receber');
                          setShowNotifications(false);
                        }}
                        className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-100 cursor-pointer text-xs transition-colors"
                      >
                        <div className="font-semibold text-rose-800">Pagamento Atrasado: {s.clientName}</div>
                        <div className="text-rose-600 mt-0.5">Saldo devedor: R$ {s.remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}

                    {lowStockBatches.map(b => (
                      <div 
                        key={b.id}
                        onClick={() => {
                          setCurrentModule('estoque');
                          setShowNotifications(false);
                        }}
                        className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-100 cursor-pointer text-xs transition-colors"
                      >
                        <div className="font-semibold text-amber-800">Estoque Baixo: {b.vaccineName}</div>
                        <div className="text-amber-600 mt-0.5">Lote {b.lotNumber}: apenas {b.currentQuantity} un restantes.</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-blue-400/40 hidden sm:block" />

        {/* Profile Pill matching reference design: "ROBERT WILLIAM v" */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 py-1 px-2.5 rounded-full hover:bg-blue-700/60 border border-transparent hover:border-blue-400/30 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            
            <div className="hidden sm:block">
              <span className="text-xs font-bold tracking-wider uppercase text-white group-hover:text-blue-100 block">
                {user.name}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-transform" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  Administrador Dono
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setCurrentModule('configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Configurações da Conta
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sair do PYFAR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
