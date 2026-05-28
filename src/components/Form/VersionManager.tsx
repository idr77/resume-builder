import React, { useState, useEffect } from 'react';
import type { ResumeData } from '../../types/resume';
import { Save, FolderOpen, Copy, Trash2, Database, ChevronDown, ChevronUp, Cloud, Star } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { apiService, type SavedVersion } from '../../utils/apiService';

interface Props {
  data: ResumeData;
  onLoad: (loadedData: ResumeData) => void;
  language: 'en' | 'fr';
  activeVersion: { id: string; name: string } | null;
  setActiveVersion: (ver: { id: string; name: string } | null) => void;
}

export default function VersionManager({ data, onLoad, language, activeVersion, setActiveVersion }: Props) {
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [isCloud, setIsCloud] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(() => {
    return localStorage.getItem('ats_default_cv_version_id');
  });

  const handleSetDefault = (versionId: string) => {
    if (defaultVersionId === versionId) {
      localStorage.removeItem('ats_default_cv_version_id');
      setDefaultVersionId(null);
      showNotification(language === 'fr' 
        ? "Option retirée : le dernier CV modifié sera chargé au démarrage." 
        : "Default unset: the latest modified CV will load on startup."
      );
    } else {
      localStorage.setItem('ats_default_cv_version_id', versionId);
      setDefaultVersionId(versionId);
      showNotification(language === 'fr' 
        ? "Version définie par défaut pour le démarrage !" 
        : "Version set as default for startup!"
      );
    }
  };

  // Safe wrapper for localStorage.setItem to handle quota errors
  const safeSetLocalStorage = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        // Reactive Pruning: Try to delete the oldest version (not 'initial') to free space
        try {
          const stored = localStorage.getItem('ats_resumes_history');
          if (stored) {
            const parsed = JSON.parse(stored) as SavedVersion[];
            const nonInitial = parsed.filter(v => v.id !== 'initial');
            if (nonInitial.length > 0) {
              const oldest = nonInitial[nonInitial.length - 1];
              const updatedVersions = parsed.filter(v => v.id !== oldest.id);
              
              // Save the pruned versions list to free space
              localStorage.setItem('ats_resumes_history', JSON.stringify(updatedVersions));
              setVersions(updatedVersions);
              
              // Retry saving the original request
              localStorage.setItem(key, value);
              
              showNotification(language === 'fr' 
                ? `Mémoire saturée : la version "${oldest.name}" a été nettoyée.`
                : `Storage full: version "${oldest.name}" was automatically pruned.`
              );
              return true;
            }
          }
        } catch (pruneErr) {
          console.error('Failed to auto-prune on QuotaExceededError:', pruneErr);
        }

        const errorMsg = language === 'fr'
          ? "La mémoire locale est saturée (Quota de 5 Mo dépassé). Veuillez supprimer d'anciennes versions pour libérer de l'espace ou vider le stockage."
          : "Local storage is full (5MB quota exceeded). Please delete older versions or clear the storage in settings.";
        alert(errorMsg);
        setMessage(language === 'fr' ? "Erreur : Mémoire saturée !" : "Error: Storage full!");
      } else {
        console.error('LocalStorage write failed:', e);
      }
      return false;
    }
  };

  // Load versions on mount
  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const online = await apiService.checkHealth();
      if (online && apiService.isLoggedIn()) {
        const cloudVersions = await apiService.fetchVersions();
        setVersions(cloudVersions);
        setIsCloud(true);
        if (!activeVersion && cloudVersions.length > 0) {
          setActiveVersion({ id: cloudVersions[0].id, name: cloudVersions[0].name });
        }
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Backend server offline or unauthenticated. Falling back to local storage.', e);
    }

    // Fallback to Local Storage
    setIsCloud(false);
    try {
      const stored = localStorage.getItem('ats_resumes_history');
      if (stored) {
        const parsed = JSON.parse(stored) as SavedVersion[];
        setVersions(parsed);
        if (!activeVersion && parsed.length > 0) {
          setActiveVersion({ id: parsed[0].id, name: parsed[0].name });
        }
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
        if (!activeVersion) {
          setActiveVersion({ id: 'initial', name: initial.name });
        }
      }
    } catch (e) {
      console.error('Error loading local versions', e);
    } finally {
      setIsLoading(false);
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

  const MAX_VERSIONS = 10;

  const pruneHistoryList = (list: SavedVersion[]): SavedVersion[] => {
    if (list.length <= MAX_VERSIONS) return list;
    const initialVersion = list.find(v => v.id === 'initial');
    const others = list.filter(v => v.id !== 'initial');
    const allowedOthersCount = initialVersion ? MAX_VERSIONS - 1 : MAX_VERSIONS;
    const keptOthers = others.slice(0, allowedOthersCount);
    return initialVersion ? [initialVersion, ...keptOthers] : keptOthers;
  };

  const handleManualUpdate = async () => {
    if (!activeVersion) return;
    setIsLoading(true);
    const targetData = {
      ...data,
      styleSettings: data.styleSettings || {
        template: 'classic',
        themeColor: 'slate',
        fontFamily: 'Helvetica',
        fontSize: 'medium'
      }
    };

    try {
      if (isCloud) {
        await apiService.saveVersion(activeVersion.name, targetData);
        // Refresh version list
        const cloudVersions = await apiService.fetchVersions();
        setVersions(cloudVersions);
        showNotification(language === 'fr' ? 'Version active mise à jour sur le Cloud !' : 'Active version updated on Cloud!');
      } else {
        const stored = localStorage.getItem('ats_resumes_history');
        if (stored) {
          const parsed = JSON.parse(stored) as SavedVersion[];
          const updated = parsed.map(v => v.id === activeVersion.id ? { 
            ...v, 
            data: targetData,
            updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
          } : v);
          safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated));
          setVersions(updated);
          showNotification(language === 'fr' ? 'Version active mise à jour localement !' : 'Active version updated locally!');
        }
      }
    } catch (err) {
      showNotification(language === 'fr' ? 'Échec de la mise à jour' : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    const targetData = {
      ...data,
      styleSettings: data.styleSettings || {
        template: 'classic',
        themeColor: 'slate',
        fontFamily: 'Helvetica',
        fontSize: 'medium'
      }
    };

    if (isCloud) {
      setIsLoading(true);
      try {
        const saved = await apiService.saveVersion(newVersionName.trim(), targetData);
        // Refresh version list
        const cloudVersions = await apiService.fetchVersions();
        setVersions(cloudVersions);
        const matched = cloudVersions.find(v => v.name === newVersionName.trim());
        if (matched) {
          setActiveVersion({ id: matched.id, name: matched.name });
        } else {
          setActiveVersion({ id: saved.id, name: saved.name });
        }
        setNewVersionName('');
        showNotification(language === 'fr' ? 'Nouvelle version sauvegardée sur le Cloud !' : 'New version saved to Cloud!');
      } catch (err: any) {
        showNotification(language === 'fr' ? 'Erreur de sauvegarde Cloud' : 'Cloud save failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Local Storage Save
    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      name: newVersionName.trim(),
      updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      data: targetData
    };

    const updated = pruneHistoryList([newVersion, ...versions.filter(v => v.name !== newVersion.name)]);
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated))) {
      setVersions(updated);
      setActiveVersion({ id: newVersion.id, name: newVersion.name });
      setNewVersionName('');
      showNotification(language === 'fr' ? 'Nouvelle version sauvegardée localement !' : 'New version saved locally!');
    }
  };

  const handleLoad = (version: SavedVersion) => {
    onLoad(version.data);
    setActiveVersion({ id: version.id, name: version.name });
    showNotification(language === 'fr' ? `Version "${version.name}" chargée !` : `Loaded "${version.name}"!`);
  };

  const handleDuplicate = async (version: SavedVersion) => {
    const duplicatedName = `${version.name} (${language === 'fr' ? 'Copie' : 'Copy'})`;

    if (isCloud) {
      setIsLoading(true);
      try {
        const saved = await apiService.saveVersion(duplicatedName, version.data);
        const cloudVersions = await apiService.fetchVersions();
        setVersions(cloudVersions);
        const matched = cloudVersions.find(v => v.name === duplicatedName);
        if (matched) {
          setActiveVersion({ id: matched.id, name: matched.name });
        } else {
          setActiveVersion({ id: saved.id, name: saved.name });
        }
        showNotification(language === 'fr' ? 'Version dupliquée sur le Cloud !' : 'Version duplicated on Cloud!');
      } catch (err) {
        showNotification(language === 'fr' ? 'Échec de duplication Cloud' : 'Cloud duplication failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Local Storage Duplicate
    const duplicated: SavedVersion = {
      id: Date.now().toString(),
      name: duplicatedName,
      updatedAt: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      data: version.data
    };
    const updated = pruneHistoryList([duplicated, ...versions]);
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(updated))) {
      setVersions(updated);
      setActiveVersion({ id: duplicated.id, name: duplicated.name });
      showNotification(language === 'fr' ? 'Version dupliquée localement !' : 'Version duplicated locally!');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === 'initial') {
      alert(language === 'fr' ? "Impossible de supprimer la version initiale." : "Cannot delete the initial version.");
      return;
    }
    const confirmMsg = language === 'fr' 
      ? `Supprimer définitivement la version "${name}" ?`
      : `Are you sure you want to delete "${name}"?`;
    if (!window.confirm(confirmMsg)) return;

    const remainingVersions = versions.filter(v => v.id !== id);

    if (isCloud) {
      setIsLoading(true);
      try {
        const success = await apiService.deleteVersion(id);
        if (success) {
          setVersions(remainingVersions);
          if (activeVersion?.id === id && remainingVersions.length > 0) {
            setActiveVersion({ id: remainingVersions[0].id, name: remainingVersions[0].name });
            onLoad(remainingVersions[0].data);
          }
          showNotification(language === 'fr' ? 'Version supprimée du Cloud.' : 'Version deleted from Cloud.');
        }
      } catch (err) {
        showNotification(language === 'fr' ? 'Échec de suppression Cloud' : 'Cloud deletion failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Local Storage Delete
    if (safeSetLocalStorage('ats_resumes_history', JSON.stringify(remainingVersions))) {
      setVersions(remainingVersions);
      if (activeVersion?.id === id && remainingVersions.length > 0) {
        setActiveVersion({ id: remainingVersions[0].id, name: remainingVersions[0].name });
        onLoad(remainingVersions[0].data);
      }
      showNotification(language === 'fr' ? 'Version locale supprimée.' : 'Local version deleted.');
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
          {isCloud ? (
            <Cloud size={18} className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
          ) : (
            <Database size={18} className="text-indigo-500 dark:text-indigo-400" />
          )}
          <span>
            {isCloud 
              ? (isFrench ? 'Gestionnaire de Versions (Synchronisé Cloud)' : 'Version Manager (Cloud Synced)')
              : (isFrench ? 'Gestionnaire de Versions (Sauvegarde locale)' : 'Version Manager (Local Storage)')}
          </span>
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

          {activeVersion && (
            <div className="flex items-center justify-between p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/60 rounded-lg shadow-sm">
              <div className="text-xs min-w-0 mr-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{isFrench ? "Version active : " : "Active version: "}</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block sm:inline truncate">{activeVersion.name}</span>
              </div>
              <button
                type="button"
                onClick={handleManualUpdate}
                disabled={isLoading}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                {isFrench ? "Enregistrer" : "Save changes"}
              </button>
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
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
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
                    onClick={() => handleSetDefault(v.id)}
                    disabled={isLoading}
                    className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-50 ${
                      defaultVersionId === v.id
                        ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' 
                        : 'text-gray-400 hover:text-amber-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    title={
                      defaultVersionId === v.id
                        ? (isFrench ? 'Version par défaut (cliquer pour désactiver)' : 'Default version (click to unset)')
                        : (isFrench ? 'Définir comme version par défaut' : 'Set as default version')
                    }
                  >
                    <Star size={14} fill={defaultVersionId === v.id ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => handleLoad(v)}
                    disabled={isLoading}
                    className="p-1 hover:bg-blue-50 dark:hover:bg-blue-955/40 text-blue-600 dark:text-blue-400 hover:text-blue-800 rounded transition-colors cursor-pointer disabled:opacity-50"
                    title={isFrench ? 'Charger cette version' : 'Load this version'}
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button 
                    onClick={() => handleDuplicate(v)}
                    disabled={isLoading}
                    className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 rounded transition-colors cursor-pointer disabled:opacity-50"
                    title={isFrench ? 'Dupliquer' : 'Duplicate'}
                  >
                    <Copy size={14} />
                  </button>
                  {v.id !== 'initial' && (
                    <button 
                      onClick={() => handleDelete(v.id, v.name)}
                      disabled={isLoading}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/45 text-red-500 dark:text-red-400 hover:text-red-700 rounded transition-colors cursor-pointer disabled:opacity-50"
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
