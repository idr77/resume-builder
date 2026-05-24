import React, { useState, useEffect } from 'react';
import type { ResumeData } from '../../types/resume';
import { Save, FolderOpen, Copy, Trash2, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';

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

  // Safe wrapper for localStorage.setItem to handle quota errors
  const safeSetLocalStorage = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        const errorMsg = language === 'fr'
          ? "La mémoire locale est saturée (Quota de 5 Mo dépassé). Veuillez supprimer d'anciennes versions pour libérer de l'espace ou retirer votre photo de profil."
          : "Local storage is full (5MB quota exceeded). Please delete older versions or compress your profile photo to free up space.";
        alert(errorMsg);
        setMessage(language === 'fr' ? "Erreur : Mémoire saturée !" : "Error: Storage full!");
      } else {
        console.error('LocalStorage write failed:', e);
      }
      return false;
    }
  };

  // Load versions from localStorage on mount and run background photo migrations
  useEffect(() => {
    loadVersionsFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVersionsFromStorage = () => {
    try {
      const stored = localStorage.getItem('ats_resumes_history');
      if (stored) {
        const parsed = JSON.parse(stored) as SavedVersion[];
        setVersions(parsed);
        // Run migration in background to compress any huge legacy base64 photos
        runBackgroundMigration(parsed);
      } else {
        // Create an initial version if empty
        const initial: SavedVersion = {
          id: 'initial',
          name: language === 'fr' ? 'Version Initiale' : 'Initial Version',
          updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          data: data
        };
        safeSetLocalStorage('ats_resumes_history', JSON.stringify([initial]));
        setVersions([initial]);
      }
    } catch (e) {
      console.error('Error loading versions', e);
    }
  };

  const runBackgroundMigration = async (storedVersions: SavedVersion[]) => {
    let hasChanges = false;
    const migrated = await Promise.all(
      storedVersions.map(async (v) => {
        const photo = v.data?.personalInfo?.photoUrl;
        // If version has a large Base64 photo string (> 70KB)
        if (photo && photo.startsWith('data:image/') && photo.length > 70000) {
          try {
            console.log(`Migrating version "${v.name}" - compressing large profile photo...`);
            const compressed = await compressImage(photo);
            hasChanges = true;
            return {
              ...v,
              data: {
                ...v.data,
                personalInfo: {
                  ...v.data.personalInfo,
                  photoUrl: compressed
                }
              }
            };
          } catch (err) {
            console.error(`Failed to compress photo in version "${v.name}":`, err);
            return v;
          }
        }
        return v;
      })
    );

    if (hasChanges) {
      console.log('Background migration complete - saving compressed versions to localStorage');
      safeSetLocalStorage('ats_resumes_history', JSON.stringify(migrated));
      setVersions(migrated);
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
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated))) {
      setVersions(updated);
      setNewVersionName('');
      showNotification(language === 'fr' ? 'Version sauvegardée !' : 'Version saved successfully!');
    }
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
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated))) {
      setVersions(updated);
      showNotification(language === 'fr' ? 'Version dupliquée !' : 'Version duplicated!');
    }
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
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated))) {
      setVersions(updated);
      showNotification(language === 'fr' ? 'Version supprimée.' : 'Version deleted.');
    }
  };

  const showNotification = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const isFrench = language === 'fr';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Database size={18} className="text-indigo-500 dark:text-indigo-400" />
          <span>{isFrench ? 'Gestionnaire de Versions (Sauvegarde locale)' : 'Version Manager (Local Storage)'}</span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
          {message && (
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 rounded text-xs text-center animate-fade-in font-medium">
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
              className="flex-1 p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              maxLength={40}
              required
            />
            <button 
              type="submit"
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
                className="flex items-center justify-between p-2.5 border border-gray-100 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{v.name}</div>
                  <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{isFrench ? 'Modifié le : ' : 'Updated: '}{v.updatedAt}</div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => handleLoad(v)}
                    className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:text-blue-800 rounded transition-colors cursor-pointer"
                    title={isFrench ? 'Charger cette version' : 'Load this version'}
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button 
                    onClick={() => handleDuplicate(v)}
                    className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 rounded transition-colors cursor-pointer"
                    title={isFrench ? 'Dupliquer' : 'Duplicate'}
                  >
                    <Copy size={14} />
                  </button>
                  {v.id !== 'initial' && (
                    <button 
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/45 text-red-500 dark:text-red-400 hover:text-red-700 rounded transition-colors cursor-pointer"
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
