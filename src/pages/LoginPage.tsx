import React, { useState } from 'react';
import { Syringe, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotPassword) {
      setForgotSent(true);
      return;
    }
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const error = await login(email, password);
      if (error) setLoginError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-purple-600 selection:text-white bg-radial-purple"
      style={{ background: 'radial-gradient(125% 125% at 50% 10%, #000000 40%, #63e 100%)' }}
    >
      {/* Dynamic Animated Background Layers */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Pulsing Radial Base */}
        <div
          className="absolute inset-0 animate-pulse-radial opacity-90 scale-105"
          style={{ background: 'radial-gradient(125% 125% at 50% 10%, transparent 35%, #7c3aed 100%)' }}
        />

        {/* Floating Glowing Blobs */}
        <div className="absolute -top-24 -left-24 w-[450px] h-[450px] bg-purple-600/30 rounded-full blur-[120px] animate-blob-1" />
        <div className="absolute -bottom-28 -right-28 w-[500px] h-[500px] bg-indigo-600/35 rounded-full blur-[130px] animate-blob-2" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-violet-500/20 rounded-full blur-[140px] animate-blob-3" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      <div className="max-w-md w-full relative z-10">
        
        {/* Logo Banner */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-white p-2.5 mx-auto">
              <img
                src="/pyfar-logo.png"
                alt="PYFAR"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PYFAR
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-medium tracking-wide">
            Saúde que conecta você ao futuro
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-7 sm:p-8 rounded-3xl shadow-2xl">
          {!isForgotPassword ? (
            <>
              <div className="mb-6 flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white">Bem-vindo, Hassan</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Digite suas credenciais para acessar o painel.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-1 rounded-full">
                  Dono / Admin
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    E-mail de Acesso
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hassan@unofar.com.br"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotSent(false);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                    {loginError}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl shadow-blue-glow transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>{isSubmitting ? 'Entrando...' : 'Entrar no Painel'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Demo Credentials Helper */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ambiente Seguro • Acesso Direto</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Recuperar Senha</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informe seu e-mail para receber as instruções de redefinição.
                </p>
              </div>

              {forgotSent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-emerald-200">E-mail de recuperação enviado!</span>
                      Verifique sua caixa de entrada no endereço <strong>{email}</strong> para redefinir sua senha.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-blue-glow transition-all"
                    >
                      Enviar Link
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          PYFAR &copy; {new Date().getFullYear()} — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
