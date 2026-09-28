import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { ToastContainer } from '../common/ToastContainer';

// Pages
import { DashboardPage } from '../../pages/DashboardPage';
import { StockPage } from '../../pages/StockPage';
import { StockEntryPage } from '../../pages/StockEntryPage';
import { SalesPage } from '../../pages/SalesPage';
import { ClientsPage } from '../../pages/ClientsPage';
import { CommissionersPage } from '../../pages/CommissionersPage';
import { CommissionsMapPage } from '../../pages/CommissionsMapPage';
import { ReceivablesPage } from '../../pages/ReceivablesPage';
import { FinancialPage } from '../../pages/FinancialPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { ReceiptsPage } from '../../pages/ReceiptsPage';
import { SettingsPage } from '../../pages/SettingsPage';

// Modals
import { NewSaleModal } from '../modals/NewSaleModal';
import { NewBatchModal } from '../modals/NewBatchModal';
import { NewClientModal } from '../modals/NewClientModal';
import { NewCommissionerModal } from '../modals/NewCommissionerModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { NewExpenseModal } from '../modals/NewExpenseModal';
import { ReceiptModal } from '../modals/ReceiptModal';
import { AdjustStockModal } from '../modals/AdjustStockModal';
import { Client, Commissioner, Sale, VaccineBatch } from '../../types';

export const AppLayout: React.FC = () => {
  const { currentModule } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal states
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isNewCommissionerOpen, setIsNewCommissionerOpen] = useState(false);
  const [commissionerToEdit, setCommissionerToEdit] = useState<Commissioner | null>(null);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [batchToAdjust, setBatchToAdjust] = useState<VaccineBatch | null>(null);

  // Listen to custom quick event
  useEffect(() => {
    const handleQuickSale = () => setIsNewSaleOpen(true);
    window.addEventListener('open-new-sale-modal', handleQuickSale);
    return () => window.removeEventListener('open-new-sale-modal', handleQuickSale);
  }, []);

  const renderModuleContent = () => {
    switch (currentModule) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenNewSale={() => setIsNewSaleOpen(true)}
            onOpenNewBatch={() => setIsNewBatchOpen(true)}
            onOpenNewExpense={() => setIsNewExpenseOpen(true)}
          />
        );
      case 'estoque':
        return (
          <StockPage
            onOpenNewBatch={() => setIsNewBatchOpen(true)}
            onAdjustStock={(batch) => setBatchToAdjust(batch)}
          />
        );
      case 'entrada_estoque':
        return <StockEntryPage onOpenNewBatchModal={() => setIsNewBatchOpen(true)} />;
      case 'vendas':
      case 'nova_venda':
        return <SalesPage onOpenNewSale={() => setIsNewSaleOpen(true)} />;
      case 'clientes':
        return (
          <ClientsPage
            onOpenNewClient={() => {
              setClientToEdit(null);
              setIsNewClientOpen(true);
            }}
            onEditClient={(client) => {
              setClientToEdit(client);
              setIsNewClientOpen(true);
            }}
          />
        );
      case 'comissionadores':
        return (
          <CommissionersPage
            onOpenNewCommissioner={() => {
              setCommissionerToEdit(null);
              setIsNewCommissionerOpen(true);
            }}
            onEditCommissioner={(comm) => {
              setCommissionerToEdit(comm);
              setIsNewCommissionerOpen(true);
            }}
          />
        );
      case 'mapa_comissoes':
        return <CommissionsMapPage />;
      case 'contas_receber':
        return (
          <ReceivablesPage
            onOpenRecordPayment={(sale) => setSaleForPayment(sale)}
          />
        );
      case 'financeiro':
        return (
          <FinancialPage
            onOpenNewExpense={() => setIsNewExpenseOpen(true)}
          />
        );
      case 'relatorios':
        return <ReportsPage />;
      case 'comprovantes':
        return <ReceiptsPage />;
      case 'configuracoes':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onOpenNewSale={() => setIsNewSaleOpen(true)}
            onOpenNewBatch={() => setIsNewBatchOpen(true)}
            onOpenNewExpense={() => setIsNewExpenseOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex font-sans">
      
      {/* Sidebar with dark aesthetic */}
      <Sidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 p-3 sm:p-5 lg:p-6 transition-all">
        
        {/* Header with Electric Blue Banner */}
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Dynamic Page Content */}
        <div className="flex-1">
          {renderModuleContent()}
        </div>
      </main>

      {/* Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
      />

      <NewBatchModal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
      />

      <NewClientModal
        isOpen={isNewClientOpen}
        onClose={() => {
          setIsNewClientOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
      />

      <NewCommissionerModal
        isOpen={isNewCommissionerOpen}
        onClose={() => {
          setIsNewCommissionerOpen(false);
          setCommissionerToEdit(null);
        }}
        commissionerToEdit={commissionerToEdit}
      />

      <RecordPaymentModal
        isOpen={!!saleForPayment}
        onClose={() => setSaleForPayment(null)}
        sale={saleForPayment}
      />

      <NewExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
      />

      <AdjustStockModal
        isOpen={!!batchToAdjust}
        onClose={() => setBatchToAdjust(null)}
        batch={batchToAdjust}
      />

      <ReceiptModal />

      {/* Floating Toasts */}
      <ToastContainer />
    </div>
  );
};
