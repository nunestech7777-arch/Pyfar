import React, { createContext, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { SellerClient, SellerData, SellerModule, SellerSale } from '../types';
import { sellerApi, SellerClientInput, SellerSaleInput } from '../services/sellerApi';
import { formatCurrency } from '../utils/formatters';
import { useApp } from './AppContext';

// Estado da área do vendedor. Tudo vem de seller_get_data() (já filtrado e sem dados sensíveis)
// e toda gravação passa pelas funções seller_* — o servidor revalida cada regra.
interface SellerContextType {
  data: SellerData | null;
  isLoading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  createClient: (input: SellerClientInput) => Promise<SellerClient | null>;
  updateClient: (id: string, input: SellerClientInput) => Promise<SellerClient | null>;
  createSale: (input: SellerSaleInput) => Promise<SellerSale | null>;
  module: SellerModule;
  setModule: (mod: SellerModule) => void;
}

const SellerContext = createContext<SellerContextType | undefined>(undefined);

export const SellerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast, updateUserName } = useApp();
  const [data, setData] = useState<SellerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [module, setModule] = useState<SellerModule>('inicio');

  const refresh = async () => {
    try {
      const fresh = await sellerApi.getData();
      setData(fresh);
      setLoadError(null);
      updateUserName(fresh.seller.name);
    } catch (err) {
      console.error('[vendedor] Falha ao carregar dados:', err);
      setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  // Carga inicial + atualização periódica (estoque e pagamentos mudam pelo admin)
  useEffect(() => {
    refresh();
    const onFocus = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const interval = setInterval(onFocus, 30000);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createClient = async (input: SellerClientInput) => {
    try {
      const client = await sellerApi.createClient(input);
      addToast('success', 'Cliente cadastrado', `${client.name} foi adicionado aos seus clientes.`);
      await refresh();
      return client;
    } catch (err) {
      addToast('error', 'Cliente não cadastrado', err instanceof Error ? err.message : 'Tente novamente.');
      return null;
    }
  };

  const updateClient = async (id: string, input: SellerClientInput) => {
    try {
      const client = await sellerApi.updateClient(id, input);
      addToast('success', 'Cliente atualizado', 'Dados do cliente alterados com sucesso.');
      await refresh();
      return client;
    } catch (err) {
      addToast('error', 'Cliente não atualizado', err instanceof Error ? err.message : 'Tente novamente.');
      return null;
    }
  };

  const createSale = async (input: SellerSaleInput) => {
    try {
      const sale = await sellerApi.createSale(input);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      addToast('success', 'Venda registrada!', `Venda ${sale.saleNumber} para ${sale.clientName} (Total: ${formatCurrency(sale.totalAmount)}).`);
      await refresh();
      return sale;
    } catch (err) {
      addToast('error', 'Venda não registrada', err instanceof Error ? err.message : 'Tente novamente.');
      return null;
    }
  };

  return (
    <SellerContext.Provider value={{ data, isLoading, loadError, refresh, createClient, updateClient, createSale, module, setModule }}>
      {children}
    </SellerContext.Provider>
  );
};

export const useSeller = () => {
  const context = useContext(SellerContext);
  if (!context) {
    throw new Error('useSeller must be used within a SellerProvider');
  }
  return context;
};
