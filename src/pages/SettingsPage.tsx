import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Building2, 
  Save, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  Percent
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AvatarUpload } from '../components/common/AvatarUpload';

export const SettingsPage: React.FC = () => {
  const {
    user, updateUser, addToast,
    clients, batches, sales, commissioners, commissions, financialTransactions, payments, stockAdjustments,
  } = useApp();

  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name,
      companyName,
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      profile: user,
      clients,
      batches,
      sales,
      commissioners,
      commissions,
      finances: financialTransactions,
      payments,
      stockAdjustments,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `pyfar_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    addToast('success', 'Backup Exportado', 'Arquivo JSON de backup baixado com sucesso.');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Configurações do Sistema
            </h1>
            <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              Perfil & Parâmetros
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personalize os dados da sua distribuidora de vacinas, comissões padrão e backups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Profile & Company (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Dados do Administrador & Empresa
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <AvatarUpload
                value={avatarUrl || undefined}
                onChange={(dataUrl) => setAvatarUrl(dataUrl || '')}
                onError={(message) => addToast('error', 'Foto não carregada', message)}
              />
              {avatarUrl !== (user.avatarUrl || '') && (
                <p className="text-[11px] font-bold text-amber-600 -mt-2">
                  Clique em "Salvar Alterações" para aplicar a nova foto.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Nome do Administrador / Dono
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Razão Social / Nome Fantasia da Distribuidora
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Aparecerá nos comprovantes impressos e compartilhados.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-blue-glow transition-all flex items-center gap-2 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Data Management & Supabase Architecture (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Backup & Demo Reset */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Backup
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Exporte todos os clientes, vendas, lotes e movimentações financeiras em formato JSON seguro para backup.
            </p>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Baixar Backup Completo (JSON)</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
