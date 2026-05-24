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

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const t = getTranslation(language).modal; // We can tap into modal dictionary for generic words

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    onClose();
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
        
        <div className="p-6 bg-white dark:bg-gray-900">
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
