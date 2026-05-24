import React, { useState, useEffect } from 'react';
import type { ResumeData } from '../../types/resume';
import { Save, FolderOpen, Copy, Trash2, Database, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  data: ResumeData;
  onLoad: (loadedData: ResumeData) => void;
  language: 'en' | 'fr';
}

interface SavedVersion {
  id: string;
  name: string;
  updatedAt: string;
  data: ResumeData;
}

export default function VersionManager({ data, onLoad, language }: Props) {
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');

  // Load versions from localStorage on mount
  useEffect(() => {
    loadVersionsFromStorage();
  }, []);

  const loadVersionsFromStorage = () => {
    try {
      const stored = localStorage.getItem('ats_resumes_history');
      if (stored) {
        setVersions(JSON.parse(stored));
      } else {
        // Create an initial version if empty
        const initial: SavedVersion = {
          id: 'initial',
          name: language === 'fr' ? 'Version Initiale' : 'Initial Version',
          updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          data: data
        };
        localStorage.setItem('ats_resumes_history', JSON.stringify([initial]));
        setVersions([initial]);
      }
    } catch (e) {
      console.error('Error loading versions', e);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      name: newVersionName.trim(),
      updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      data: {
        ...data,
        // Set styleSettings defaults if missing
        styleSettings: data.styleSettings || {
          template: 'classic',
          themeColor: 'slate',
          fontFamily: 'Helvetica',
          fontSize: 'medium'
        }
      }
    };

    const updated = [newVersion, ...versions.filter(v => v.name !== newVersion.name)];
    localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
    setVersions(updated);
    setNewVersionName('');
    showNotification(language === 'fr' ? 'Version sauvegardée !' : 'Version saved successfully!');
  };

  const handleLoad = (version: SavedVersion) => {
    onLoad(version.data);
    showNotification(language === 'fr' ? `Version "${version.name}" chargée !` : `Loaded "${version.name}"!`);
  };

  const handleDuplicate = (version: SavedVersion) => {
    const duplicated: SavedVersion = {
      id: Date.now().toString(),
      name: `${version.name} (${language === 'fr' ? 'Copie' : 'Copy'})`,
      updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      data: version.data
    };
    const updated = [duplicated, ...versions];
    localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
    setVersions(updated);
    showNotification(language === 'fr' ? 'Version dupliquée !' : 'Version duplicated!');
  };

  const handleDelete = (id: string, name: string) => {
    if (id === 'initial') {
      alert(language === 'fr' ? "Impossible de supprimer la version initiale." : "Cannot delete the initial version.");
      return;
    }
    const confirmMsg = language === 'fr' 
      ? `Supprimer définitivement la version "${name}" ?`
      : `Are you sure you want to delete "${name}"?`;
    if (!window.confirm(confirmMsg)) return;

    const updated = versions.filter(v => v.id !== id);
    localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
    setVersions(updated);
    showNotification(language === 'fr' ? 'Version supprimée.' : 'Version deleted.');
  };

  const showNotification = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const isFrench = language === 'fr';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Database size={18} className="text-indigo-500" />
          <span>{isFrench ? 'Gestionnaire de Versions (Sauvegarde locale)' : 'Version Manager (Local Storage)'}</span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {message && (
            <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs text-center animate-fade-in font-medium">
              {message}
            </div>
          )}

          {/* Form to Save Current CV */}
          <form onSubmit={handleSave} className="flex gap-2">
            <input 
              type="text" 
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder={isFrench ? "Ex: Développeur React - Google..." : "e.g. React Dev - Google..."}
              className="flex-1 p-2 text-xs border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              maxLength={40}
              required
            />
            <button 
              type="submit"
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs font-semibold shadow-sm transition-colors"
            >
              <Save size={14} />
              {isFrench ? 'Sauver' : 'Save'}
            </button>
          </form>

          {/* List of Saved Versions */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {versions.map(v => (
              <div 
                key={v.id} 
                className="flex items-center justify-between p-2.5 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-xs font-semibold text-gray-700 truncate">{v.name}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{isFrench ? 'Modifié le : ' : 'Updated: '}{v.updatedAt}</div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => handleLoad(v)}
                    className="p-1 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded transition-colors"
                    title={isFrench ? 'Charger cette version' : 'Load this version'}
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button 
                    onClick={() => handleDuplicate(v)}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded transition-colors"
                    title={isFrench ? 'Dupliquer' : 'Duplicate'}
                  >
                    <Copy size={14} />
                  </button>
                  {v.id !== 'initial' && (
                    <button 
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                      title={isFrench ? 'Supprimer' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
