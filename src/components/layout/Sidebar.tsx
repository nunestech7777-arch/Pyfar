import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  PackagePlus, 
  ShoppingCart, 
  Users, 
  UserCheck, 
  Percent, 
  CircleDollarSign, 
  Landmark, 
  BarChart3, 
  ReceiptText, 
  Settings, 
  LogOut,
  Syringe,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSaleOverdue } from '../../utils/financeRules';
import { NavigationModule } from '../../types';
import { isDateExpired, isDateNearExpiry } from '../../utils/formatters';

interface NavItem {
  id: NavigationModule;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  isSpecial?: boolean;
}

export const Sidebar: React.FC<{ isOpenMobile: boolean; onCloseMobile: () => void }> = ({ 
  isOpenMobile, 
  onCloseMobile 
}) => {
  const { currentModule, setCurrentModule, logout, sales, batches, commissions } = useApp();

  // Badges calculations
  const overdueCount = sales.filter(s => isSaleOverdue(s)).length;
  const criticalStockCount = batches.filter(b => b.currentQuantity <= 20 || isDateExpired(b.expirationDate) || isDateNearExpiry(b.expirationDate)).length;
  const pendingCommissionsCount = commissions.filter(c => c.status === 'liberada').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'contas_receber', label: 'Contas a Receber', icon: CircleDollarSign, badge: overdueCount > 0 ? `${overdueCount} atras.` : undefined, badgeColor: 'bg-rose-500 text-white' },
    { id: 'estoque', label: 'Estoque', icon: Package, badge: criticalStockCount > 0 ? criticalStockCount : undefined, badgeColor: 'bg-amber-500 text-white' },
    { id: 'entrada_estoque', label: 'Entrada de Estoque', icon: PackagePlus },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'comissionadores', label: 'Comissionadores', icon: UserCheck },
    { id: 'mapa_comissoes', label: 'Mapa de Comissões', icon: Percent, badge: pendingCommissionsCount > 0 ? `${pendingCommissionsCount} lib.` : undefined, badgeColor: 'bg-emerald-500 text-white' },
    { id: 'financeiro', label: 'Financeiro & Caixa', icon: Landmark },
    { id: 'relatorios', label: 'Relatórios & BI', icon: BarChart3 },
    { id: 'comprovantes', label: 'Comprovantes / Recibos', icon: ReceiptText },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleNavClick = (id: NavigationModule) => {
    setCurrentModule(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#000000] text-white flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Header / Logo */}
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-3 border-b border-zinc-900">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
              <img
                src="/pyfar-logo.png"
                alt="PYFAR"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-lg text-white font-sans">PYFAR</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Saúde que conecta você ao futuro</p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="px-1 mb-4">
            <button
              onClick={() => {
                setCurrentModule('vendas');
                // Open new sale modal trigger
                window.dispatchEvent(new CustomEvent('open-new-sale-modal'));
                onCloseMobile();
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-2.5 px-3.5 rounded-xl shadow-blue-glow flex items-center justify-center gap-2 text-sm transition-all duration-200 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nova Venda Rápida</span>
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="space-y-1 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
                    ${isActive 
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section with Logout */}
        <div className="pt-3 border-t border-zinc-900 space-y-2">
          {overdueCount > 0 && (
            <div 
              onClick={() => handleNavClick('contas_receber')}
              className="cursor-pointer bg-rose-950/40 border border-rose-900/50 hover:bg-rose-950/60 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-rose-300 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
              <div className="leading-tight">
                <span className="font-semibold">{overdueCount} cliente(s)</span> com parcelas atrasadas!
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </aside>
    </>
  );
};
