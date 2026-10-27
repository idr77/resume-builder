import React, { useState } from 'react';
import { Cloud, Loader2, Lock, Mail, Sun, Moon, ShieldCheck, ArrowRight, HardDrive } from 'lucide-react';
import { apiService } from '../../utils/apiService';
import type { Language } from '../../types/resume';

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLoginSuccess: () => void;
  onContinueOffline: () => void;
}

export default function CloudLoginPage({
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  onLoginSuccess,
  onContinueOffline,
}: Props) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(() => localStorage.getItem('ats_backend_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFr = language === 'fr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'login') {
        await apiService.login(email.trim(), password);
      } else {
        await apiService.signup(email.trim(), password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(
        err.message ||
          (isFr ? "Une erreur s'est produite lors de l'authentification." : 'Authentication failed.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            RT
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
              ResumeT3ch
            </span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              Cloud Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title={isFr ? 'Changer de thème' : 'Switch Theme'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                language === 'fr'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="px-8 pt-8 pb-6 bg-gray-50/70 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Cloud size={24} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isFr ? 'Serveur Cloud PostgreSQL détecté' : 'Cloud PostgreSQL Server Detected'}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 dark:text-white pt-1">
              {authMode === 'login'
                ? isFr
                  ? 'Connexion à votre espace'
                  : 'Sign in to your workspace'
                : isFr
                ? 'Créer votre compte Cloud'
                : 'Create your Cloud account'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isFr
                ? 'Retrouvez et synchronisez tous vos CV et candidatures sur votre serveur.'
                : 'Access and synchronize all your resumes and job applications on your server.'}
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {isFr ? 'Se connecter' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {isFr ? 'Créer un compte' : 'Sign Up'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isFr ? 'Adresse e-mail' : 'Email address'}
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isFr ? 'Mot de passe' : 'Password'}
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isFr ? 'Authentification...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {authMode === 'login'
                      ? isFr
                        ? 'Se connecter'
                        : 'Sign In'
                      : isFr
                      ? 'Créer mon compte'
                      : 'Create Account'}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>
                  {isFr
                    ? 'Authentification JWT sécurisée & sauvegarde PostgreSQL'
                    : 'Secure JWT authentication & PostgreSQL persistence'}
                </span>
              </div>

              <button
                type="button"
                onClick={onContinueOffline}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                <HardDrive size={13} />
                <span>
                  {isFr
                    ? 'Continuer hors-ligne (Stockage navigateur uniquement)'
                    : 'Continue offline (Browser storage only)'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
