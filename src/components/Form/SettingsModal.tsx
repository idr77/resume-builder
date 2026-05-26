import { useState, useEffect } from 'react';
import { getTranslation } from '../../i18n/translations';
import type { Language } from '../../types/resume';

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

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
      calculateStorageSizes();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const t = getTranslation(language).modal; // We can tap into modal dictionary for generic words

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    onClose();
  };

  const handleClearAllData = () => {
    const confirmMsg = language === 'fr'
      ? "ATTENTION : Cela va supprimer définitivement TOUTES vos données (historique des CV, suivi des candidatures, clé API et préférences de thème). Cette action est irréversible.\n\nVoulez-vous continuer ?"
      : "WARNING: This will permanently delete ALL your data (CV history, applications tracker, API key, and theme preferences). This action cannot be undone.\n\nDo you want to continue?";
    
    if (window.confirm(confirmMsg)) {
      localStorage.removeItem('ats_resumes_history');
      localStorage.removeItem('ats_applications_tracker');
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('app_theme');
      
      // Reload to apply changes and reset state
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 rounded-t-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            {language === 'fr' ? 'Paramètres' : 'Settings'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer">&times;</button>
        </div>
        
        <div className="p-6 bg-white dark:bg-gray-900 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Gemini API Key</label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="AIzaSy..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {language === 'fr' 
                ? "Votre clé est stockée localement dans votre navigateur et n'est envoyée qu'à l'API de Google."
                : "Your key is stored locally in your browser and is only sent directly to Google's API."}
            </p>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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
                ? "L'application sauvegarde automatiquement vos versions de CV et le suivi des candidatures. Si cet espace est plein, les anciennes versions seront automatiquement nettoyées."
                : "The application automatically backs up your CV versions and application tracker. If this space is full, older versions will be automatically pruned."}
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
