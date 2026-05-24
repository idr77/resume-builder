import type { ResumeStyleSettings } from '../../types/resume';
import { Palette, Layout, Type } from 'lucide-react';

interface Props {
  settings: ResumeStyleSettings;
  onChange: (settings: ResumeStyleSettings) => void;
  language: 'en' | 'fr';
}

const colorMap = {
  slate: { hex: '#475569', bg: 'bg-slate-600', name: 'Slate' },
  navy: { hex: '#1e3a8a', bg: 'bg-blue-900', name: 'Navy' },
  emerald: { hex: '#059669', bg: 'bg-emerald-600', name: 'Emerald' },
  indigo: { hex: '#4f46e5', bg: 'bg-indigo-600', name: 'Indigo' },
  burgundy: { hex: '#881337', bg: 'bg-rose-900', name: 'Burgundy' }
};

export default function StyleControls({ settings, onChange, language }: Props) {
  const isFrench = language === 'fr';

  const updateSetting = <K extends keyof ResumeStyleSettings>(key: K, value: ResumeStyleSettings[K]) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-sm z-10 transition-colors">
      
      {/* Template Select */}
      <div className="flex items-center gap-2">
        <Layout size={14} className="text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {isFrench ? 'Modèle :' : 'Template:'}
        </span>
        <select 
          value={settings.template} 
          onChange={(e) => updateSetting('template', e.target.value as any)}
          className="p-1 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:ring-1 focus:ring-indigo-500"
        >
          <option value="classic">{isFrench ? 'Classic (Actuel)' : 'Classic (Current)'}</option>
          <option value="modern">{isFrench ? 'Modern' : 'Modern'}</option>
          <option value="executive">{isFrench ? 'Executive' : 'Executive'}</option>
        </select>
      </div>

      {/* Accent Colors */}
      <div className="flex items-center gap-2">
        <Palette size={14} className="text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {isFrench ? 'Couleur :' : 'Color:'}
        </span>
        <div className="flex items-center gap-1.5">
          {(Object.keys(colorMap) as Array<keyof typeof colorMap>).map((col) => {
            const isActive = settings.themeColor === col;
            return (
              <button 
                key={col}
                type="button"
                onClick={() => updateSetting('themeColor', col)}
                className={`w-5 h-5 rounded-full ${colorMap[col].bg} transition-all cursor-pointer ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                title={colorMap[col].name}
              />
            );
          })}
        </div>
      </div>

      {/* Font Family */}
      <div className="flex items-center gap-2">
        <Type size={14} className="text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {isFrench ? 'Police :' : 'Font:'}
        </span>
        <select 
          value={settings.fontFamily} 
          onChange={(e) => updateSetting('fontFamily', e.target.value as any)}
          className="p-1 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:ring-1 focus:ring-indigo-500"
        >
          <option value="Helvetica">Sans-Serif (Helvetica)</option>
          <option value="Times-Roman">Serif (Times-Roman)</option>
          <option value="Courier">Monospace (Courier)</option>
        </select>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-2">
        <Type size={14} className="text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {isFrench ? 'Taille :' : 'Size:'}
        </span>
        <select 
          value={settings.fontSize} 
          onChange={(e) => updateSetting('fontSize', e.target.value as any)}
          className="p-1 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:ring-1 focus:ring-indigo-500"
        >
          <option value="small">{isFrench ? 'Petit' : 'Small'}</option>
          <option value="medium">{isFrench ? 'Moyen' : 'Medium'}</option>
          <option value="large">{isFrench ? 'Grand' : 'Large'}</option>
        </select>
      </div>
      
    </div>
  );
}
