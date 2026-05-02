import { useState } from 'react';
import type { Language } from '../../types/resume';
import { getTranslation } from '../../i18n/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
  language: Language;
}

export default function ImportModal({ isOpen, onClose, onImport, language }: Props) {
  const [text, setText] = useState('');

  if (!isOpen) return null;
  
  const t = getTranslation(language).modal;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 className="font-semibold text-gray-800">{t.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4">{t.description}</p>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder={t.placeholder}
          />
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition-colors bg-white">{t.cancel}</button>
          <button 
            onClick={() => {
              onImport(text);
              onClose();
            }} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium shadow-sm"
          >
            {t.importData}
          </button>
        </div>
      </div>
    </div>
  );
}
