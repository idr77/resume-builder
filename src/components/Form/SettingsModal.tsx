import { useState, useEffect } from 'react';
import { getTranslation } from '../../i18n/translations';
import type { Language } from '../../types/resume';
import { apiService } from '../../utils/apiService';
import { Cloud, CloudOff, RefreshCw, Loader2, LogOut, CheckCircle, Database } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function SettingsModal({ isOpen, onClose, language }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [storageSize, setStorageSize] = useState(0); // KB
  const [historySize, setHistorySize] = useState(0); // KB
  const [trackerSize, setTrackerSize] = useState(0); // KB

  // Backend / Cloud connection state
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const calculateStorageSizes = () => {
    let total = 0;
    let history = 0;
    let tracker = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = (localStorage[key].length + key.length) * 2; // in bytes (UTF-16 characters are 2 bytes)
        total += size;
        if (key === 'ats_resumes_history') {
          history += size;
        } else if (key === 'ats_applications_tracker') {
          tracker += size;
        }
      }
    }
    setStorageSize(total / 1024); // KB
    setHistorySize(history / 1024); // KB
    setTrackerSize(tracker / 1024); // KB
  };

  const checkBackendHealthAndAuth = async () => {
    const online = await apiService.checkHealth();
    setIsServerOnline(online);
    setIsLoggedIn(apiService.isLoggedIn());
    setAuthEmail(apiService.getEmail());
  };

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
      calculateStorageSizes();
      checkBackendHealthAndAuth();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const t = getTranslation(language).modal;

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    onClose();
  };

  const handleAuthConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);
    try {
      if (authMode === 'login') {
        await apiService.login(email.trim(), password);
      } else {
        await apiService.signup(email.trim(), password);
      }
      setEmail('');
      setPassword('');
      setIsLoggedIn(true);
      setAuthEmail(apiService.getEmail());
      // Reload page to re-trigger global data loads with cloud sync
      window.location.reload();
    } catch (err: any) {
      setAuthError(err.message || 'Une erreur s\'est produite');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setIsLoggedIn(false);
    setAuthEmail('');
    window.location.reload();
  };

  const handleSyncLocalToCloud = async () => {
    if (!isServerOnline || !isLoggedIn) return;
    setIsSyncing(true);
    try {
      const localHistoryStr = localStorage.getItem('ats_resumes_history');
      if (localHistoryStr) {
        const localHistory = JSON.parse(localHistoryStr);
        await apiService.syncVersions(localHistory);
      }

      const localTrackerStr = localStorage.getItem('ats_applications_tracker');
      if (localTrackerStr) {
        const localTracker = JSON.parse(localTrackerStr);
        await apiService.syncApplications(localTracker);
      }

      alert(language === 'fr'
        ? "Données synchronisées avec succès sur votre base de données Postgres !"
        : "Data successfully synchronized with your PostgreSQL database!");
      
      calculateStorageSizes();
    } catch (e: any) {
      alert(language === 'fr'
        ? "Échec de la synchronisation : " + e.message
        : "Sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllData = () => {
    const confirmMsg = language === 'fr'
      ? "ATTENTION : Cela va supprimer définitivement TOUTES vos données locales et vos sessions. Cette action est irréversible.\n\nVoulez-vous continuer ?"
      : "WARNING: This will permanently delete ALL your local data and session preferences. This action cannot be undone.\n\nDo you want to continue?";
    
    if (window.confirm(confirmMsg)) {
      localStorage.removeItem('ats_resumes_history');
      localStorage.removeItem('ats_applications_tracker');
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('app_theme');
      apiService.logout();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 rounded-t-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span>{language === 'fr' ? 'Paramètres & Synchronisation' : 'Settings & Cloud Sync'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer">&times;</button>
        </div>
        
        <div className="p-6 bg-white dark:bg-gray-900 space-y-5">
          {/* Section: Backend Cloud Connection */}
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cloud size={14} className="text-indigo-500" />
              {language === 'fr' ? 'Connexion Serveur Cloud' : 'Cloud Server Connection'}
            </h4>

            {!isServerOnline ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CloudOff size={14} />
                  <span>{language === 'fr' ? 'Mode local (Hors ligne)' : 'Local Mode (Offline)'}</span>
                </div>
                <p>
                  {language === 'fr'
                    ? "Le serveur backend n'a pas été détecté. L'application utilise votre stockage local. Lancez le serveur avec docker-compose pour activer les fonctionnalités Cloud."
                    : "The backend server was not detected. The application is running in local mode. Start the server using docker-compose to unlock Cloud features."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {isLoggedIn ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span>{language === 'fr' ? 'Connecté au Cloud' : 'Connected to Cloud'}</span>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-1 text-[10px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 px-2 py-1 rounded transition-colors cursor-pointer"
                      >
                        <LogOut size={10} />
                        {language === 'fr' ? 'Déconnexion' : 'Log Out'}
                      </button>
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{authEmail}</p>

                    <button 
                      onClick={handleSyncLocalToCloud}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow-sm transition-colors text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          {language === 'fr' ? 'Synchronisation...' : 'Syncing...'}
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          {language === 'fr' ? 'Exporter mes données locales vers le Cloud' : 'Import local data to Cloud DB'}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthConnect} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg space-y-3.5">
                    <div className="flex border-b border-gray-200 dark:border-gray-800 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-900">
                      <button 
                        type="button"
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${authMode === 'login' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'fr' ? 'Se connecter' : 'Sign In'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                        className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${authMode === 'signup' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {language === 'fr' ? 'Créer un compte' : 'Sign Up'}
                      </button>
                    </div>

                    {authError && (
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs border border-rose-100 dark:border-rose-900/50 rounded font-medium text-center">
                        {authError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={language === 'fr' ? 'Mot de passe' : 'Password'}
                        required
                        className="w-full p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      {isAuthenticating && <Loader2 size={12} className="animate-spin mr-1" />}
                      {authMode === 'login' 
                        ? (language === 'fr' ? 'Se Connecter' : 'Connect') 
                        : (language === 'fr' ? 'Créer mon Compte' : 'Register Account')}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Section: Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Gemini API Key</label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-xs"
              placeholder="AIzaSy..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {language === 'fr' 
                ? "Votre clé est stockée localement dans votre navigateur. En mode Cloud, vous pouvez également utiliser votre clé personnelle ou consommer le crédit de jetons du serveur."
                : "Your key is stored locally in your browser. In Cloud mode, you can use your own key or consume token credits on the server."}
            </p>
          </div>

          {/* Section: Storage sizes and operations */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database size={13} className="text-gray-500" />
              {language === 'fr' ? 'Gestion du Stockage Local' : 'Local Storage Management'}
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{language === 'fr' ? 'Utilisation totale :' : 'Total Usage:'}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {storageSize.toFixed(1)} KB / 5120 KB ({(storageSize / 5120 * 100).toFixed(1)}%)
                </span>
              </div>
              
              {/* Visual Progress Bar */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageSize > 4000 
                      ? 'bg-rose-500' 
                      : storageSize > 2500 
                      ? 'bg-amber-500' 
                      : 'bg-indigo-600 dark:bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (storageSize / 5120) * 100)}%` }}
                ></div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-gray-50 dark:bg-gray-950 rounded border border-gray-100 dark:border-gray-800 text-center">
                  <span className="block text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                    {language === 'fr' ? 'Historique CV' : 'CV History'}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {historySize.toFixed(1)} KB
                  </span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-950 rounded border border-gray-100 dark:border-gray-800 text-center">
                  <span className="block text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">
                    {language === 'fr' ? 'Candidatures' : 'Tracker'}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {trackerSize.toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
              {language === 'fr'
                ? "L'application sauvegarde localement vos CV si vous n'êtes pas connecté. Si le quota local est dépassé, les anciennes versions locales seront élaguées."
                : "The application backs up CVs locally if not logged in. If local quota is exceeded, older local versions will be automatically pruned."}
            </p>

            <button 
              onClick={handleClearAllData}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/45 text-rose-600 dark:text-rose-400 hover:text-rose-700 rounded text-xs font-semibold border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
            >
              🗑️ {language === 'fr' ? 'Effacer toutes les données' : 'Clear All Data'}
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-950 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900 cursor-pointer">
            {t.cancel}
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition-colors font-medium shadow-sm cursor-pointer">
            {language === 'fr' ? 'Enregistrer' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

