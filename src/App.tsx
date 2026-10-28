import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initialResumeState, type ResumeData } from './types/resume';
import ResumeForm from './components/Form/ResumeForm';
import PDFTemplate from './components/Preview/PDFTemplate';
import CoverLetterPDFTemplate from './components/Preview/CoverLetterPDFTemplate';
import StyleControls from './components/Preview/StyleControls';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import ImportModal from './components/Form/ImportModal';
import { getTranslation } from './i18n/translations';
import SettingsModal from './components/Form/SettingsModal';
import OptimizationDashboard from './components/Preview/OptimizationDashboard';
import { analyzeResumeMatch } from './utils/atsOptimizer';
import { translateResumeWithGemini } from './utils/geminiApiService';
import { compressImage } from './utils/imageCompressor';
import { Settings, Languages, Loader2, Sun, Moon, Briefcase, FileText as FileIcon, Cloud, LogOut, Eye, Target, FolderOpen, Palette, Columns, ChevronDown } from 'lucide-react';
import VersionManager from './components/Form/VersionManager';
import ApplicationTracker from './components/Tracker/ApplicationTracker';
import ApplicationDetail from './components/Tracker/ApplicationDetail';
import CloudLoginPage from './components/Auth/CloudLoginPage';
import AIChatWidget from './components/Chat/AIChatWidget';
import type { JobApplication } from './types/tracker';
import { apiService } from './utils/apiService';

// Heuristic to extract target company from Job Description
export const extractTargetCompany = (jdText: string): string => {
  if (!jdText) return '';
  const lines = jdText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const prefixRegex = /^(company|entreprise|société|employeur|client)\s*:\s*(.+)$/i;
  for (const line of lines.slice(0, 8)) {
    const match = line.match(prefixRegex);
    if (match && match[2]) {
      return match[2].trim();
    }
  }

  // Fallback: look for "at [Company]" or "chez [Company]"
  const atRegex = /\b(at|chez)\s+([A-Z][a-zA-Z0-9_\s\-]{1,20})\b/;
  const match = jdText.match(atRegex);
  if (match && match[2]) {
    const company = match[2].trim();
    const commonWords = ['la', 'le', 'une', 'un', 'des', 'les', 'this', 'the', 'my', 'our', 'new'];
    if (!commonWords.includes(company.toLowerCase())) {
      return company;
    }
  }

  return '';
};

function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeState);
  const [debouncedResumeData, setDebouncedResumeData] = useState<ResumeData>(initialResumeState);
  const [activeVersion, setActiveVersion] = useState<{ id: string; name: string; isLocked?: boolean } | null>(null);
  const [cvSaveStatus, setCvSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedDataRef = useRef<string>('');
  const lastActiveVersionIdRef = useRef<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showImportOpen, setShowImportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]); // New state for AI keywords
  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  const [workflowTab, setWorkflowTab] = useState<'editor' | 'ats' | 'preview' | 'tracker'>('editor');
  const [showLivePreviewInEditor, setShowLivePreviewInEditor] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1280;
    return false;
  });
  const [showStyleControls, setShowStyleControls] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [cloudState, setCloudState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => apiService.isLoggedIn());
  const [offlineBypass, setOfflineBypass] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleAuthChanged = () => {
      setIsLoggedIn(apiService.isLoggedIn());
    };
    window.addEventListener('ats_auth_changed', handleAuthChanged);
    return () => window.removeEventListener('ats_auth_changed', handleAuthChanged);
  }, []);

  // Load the latest resume version on mount or auth change (either from Postgres cloud DB or local localStorage fallback)
  useEffect(() => {
    const initializeData = async () => {
      const defaultVersionId = localStorage.getItem('ats_default_cv_version_id');

      // 1. Check Spring Boot Backend Cloud status
      try {
        const online = await apiService.checkHealth();
        if (online) {
          setCloudState('online');
          if (apiService.isLoggedIn()) {
            let cloudVersions = await apiService.fetchVersions();

            // If cloud account has no versions yet, check if localStorage has non-default CVs to migrate automatically
            if (cloudVersions.length === 0) {
              const localHistoryStr = localStorage.getItem('ats_resumes_history');
              if (localHistoryStr) {
                try {
                  const localHistory = JSON.parse(localHistoryStr) as any[];
                  const nonPlaceholder = localHistory.filter(
                    v => v?.data?.personalInfo?.fullName && v.data.personalInfo.fullName !== 'Jane Doe'
                  );
                  if (nonPlaceholder.length > 0) {
                    await apiService.syncVersions(nonPlaceholder);
                    cloudVersions = await apiService.fetchVersions();
                  }
                } catch (e) {
                  console.warn('Could not auto-migrate local history:', e);
                }
              }
            }

            if (cloudVersions.length > 0) {
              let matchedVersion = cloudVersions[0];
              if (defaultVersionId) {
                const found = cloudVersions.find(v => v.id === defaultVersionId);
                if (found) {
                  matchedVersion = found;
                }
              }
              setResumeData(matchedVersion.data);
              setDebouncedResumeData(matchedVersion.data);
              lastSavedDataRef.current = JSON.stringify(matchedVersion.data);
              lastActiveVersionIdRef.current = matchedVersion.id;
              setActiveVersion({ id: matchedVersion.id, name: matchedVersion.name, isLocked: matchedVersion.isLocked });
              window.dispatchEvent(new Event('ats_resumes_history_changed'));
              return;
            } else {
              // Initialize first version in Cloud
              const initialName = resumeData.language === 'fr' ? 'Version Initiale' : 'Initial Version';
              const saved = await apiService.saveVersion(initialName, initialResumeState, false);
              setResumeData(saved.data);
              setDebouncedResumeData(saved.data);
              lastSavedDataRef.current = JSON.stringify(saved.data);
              lastActiveVersionIdRef.current = saved.id;
              setActiveVersion({ id: saved.id, name: saved.name, isLocked: saved.isLocked });
              window.dispatchEvent(new Event('ats_resumes_history_changed'));
              return;
            }
          } else {
            // Cloud is online, user is not logged in -> CloudLoginPage will be displayed unless offlineBypass is true
            setIsLoggedIn(false);
            if (!offlineBypass) {
              return;
            }
          }
        } else {
          setCloudState('offline');
        }
      } catch (err) {
        console.warn("Failed to load cloud CV data on mount, attempting local storage check", err);
        setIsLoggedIn(apiService.isLoggedIn());
      }

      // 2. Fallback: Load the default or latest version from local localStorage history if present
      try {
        const localHistoryStr = localStorage.getItem('ats_resumes_history');
        if (localHistoryStr) {
          const localHistory = JSON.parse(localHistoryStr) as any[];
          if (localHistory.length > 0) {
            let matchedVersion = localHistory[0];
            if (defaultVersionId) {
              const found = localHistory.find(v => v.id === defaultVersionId);
              if (found) {
                matchedVersion = found;
              }
            }
            setResumeData(matchedVersion.data);
            setDebouncedResumeData(matchedVersion.data);
            lastSavedDataRef.current = JSON.stringify(matchedVersion.data);
            lastActiveVersionIdRef.current = matchedVersion.id;
            setActiveVersion({ id: matchedVersion.id, name: matchedVersion.name, isLocked: matchedVersion.isLocked });
            return;
          }
        }
      } catch (err) {
        console.error("Failed to parse local resume history on mount", err);
      }

      // Default fallback
      lastSavedDataRef.current = JSON.stringify(initialResumeState);
      lastActiveVersionIdRef.current = 'initial';
      setActiveVersion({ id: 'initial', name: resumeData.language === 'fr' ? 'Version Initiale' : 'Initial Version', isLocked: false });
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, offlineBypass]);

  // Auto-save CV to active version
  useEffect(() => {
    if (!activeVersion) return;
    
    // Check if the data is actually different from initialResumeState before writing
    if (JSON.stringify(debouncedResumeData) === JSON.stringify(initialResumeState)) return;

    // If activeVersion ID changed, it means we loaded a new version or branched.
    // Update refs and skip auto-save to prevent double saves/branching.
    if (activeVersion.id !== lastActiveVersionIdRef.current) {
      lastActiveVersionIdRef.current = activeVersion.id;
      lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
      return;
    }

    // If data hasn't changed since last save/load, do nothing
    if (JSON.stringify(debouncedResumeData) === lastSavedDataRef.current) return;

    const saveActive = async () => {
      setCvSaveStatus('saving');

      // If version is locked, save active as a new unlocked version instead of overwriting!
      if (activeVersion.isLocked) {
        const nextId = Date.now().toString();
        const companyName = extractTargetCompany(resumeData.targetJobDescription || '');
        const suffix = companyName || (resumeData.language === 'fr' ? 'Personnalisé' : 'Custom');
        const nextName = `${activeVersion.name} (${suffix})`;
        
        try {
          const online = await apiService.checkHealth();
          if (online && apiService.isLoggedIn()) {
            const saved = await apiService.saveVersion(nextName, debouncedResumeData, false);
            lastActiveVersionIdRef.current = saved.id;
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setActiveVersion({ id: saved.id, name: saved.name, isLocked: false });
            setCvSaveStatus('saved');
            window.dispatchEvent(new Event('ats_resumes_history_changed'));
          } else {
            const stored = localStorage.getItem('ats_resumes_history');
            const history = stored ? JSON.parse(stored) as any[] : [];
            
            const newVersion = {
              id: nextId,
              name: nextName,
              updatedAt: new Date().toLocaleDateString(resumeData.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
              data: debouncedResumeData,
              isLocked: false
            };
            
            const updated = [newVersion, ...history];
            localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
            lastActiveVersionIdRef.current = nextId;
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setActiveVersion({ id: nextId, name: nextName, isLocked: false });
            setCvSaveStatus('saved');
            // Force a reload of versions list in VersionManager component
            window.dispatchEvent(new Event('ats_resumes_history_changed'));
          }
        } catch (err) {
          console.error("Auto-branch save failed", err);
          setCvSaveStatus('error');
        }
        setTimeout(() => setCvSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
        return;
      }

      try {
        const online = await apiService.checkHealth();
        if (online && apiService.isLoggedIn()) {
          const saved = await apiService.saveVersion(activeVersion.name, debouncedResumeData, activeVersion.isLocked);
          lastActiveVersionIdRef.current = saved.id;
          lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
          if (activeVersion.id !== saved.id) {
            setActiveVersion({ id: saved.id, name: saved.name, isLocked: saved.isLocked });
          }
          setCvSaveStatus('saved');
          window.dispatchEvent(new Event('ats_resumes_history_changed'));
        } else {
          // Local storage overwrite
          const stored = localStorage.getItem('ats_resumes_history');
          if (stored) {
            const history = JSON.parse(stored) as any[];
            const updated = history.map((v: any) => {
              if (v.id === activeVersion.id) {
                return { 
                  ...v, 
                  data: debouncedResumeData,
                  updatedAt: new Date().toLocaleDateString(resumeData.language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                };
              }
              return v;
            });
            localStorage.setItem('ats_resumes_history', JSON.stringify(updated));
            lastSavedDataRef.current = JSON.stringify(debouncedResumeData);
            setCvSaveStatus('saved');
          }
        }
      } catch (err) {
        console.error("Auto-save failed", err);
        setCvSaveStatus('error');
      }
      setTimeout(() => setCvSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
    };

    saveActive();
  }, [debouncedResumeData, activeVersion]);

  // Debounce resumeData changes for heavy PDF generation to prevent input lag
  useEffect(() => {
    setIsGeneratingPreview(true);
    const timer = setTimeout(() => {
      setDebouncedResumeData(resumeData);
      setIsGeneratingPreview(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeData]);

  const atsResult = useMemo(() => analyzeResumeMatch(resumeData, aiKeywords), [resumeData, aiKeywords]);

  const memoizedPdfDocument = useMemo(() => {
    return previewTab === 'cv' 
      ? <PDFTemplate data={debouncedResumeData} template={debouncedResumeData.styleSettings?.template || 'classic'} /> 
      : <CoverLetterPDFTemplate data={debouncedResumeData} />;
  }, [debouncedResumeData, previewTab]);

  const handleImport = async (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.personalInfo) {
        // Automatically compress photoUrl if it's a large Base64 string in the imported JSON CV
        let photoUrl = parsed.personalInfo.photoUrl;
        if (photoUrl && photoUrl.startsWith('data:image/') && photoUrl.length > 70000) {
          try {
            console.log("Compressing large base64 photoUrl from imported JSON CV...");
            photoUrl = await compressImage(photoUrl);
          } catch (err) {
            console.error("Failed to compress imported photoUrl:", err);
          }
        }

        const nextData: ResumeData = {
          ...resumeData,
          ...parsed,
          personalInfo: {
            ...parsed.personalInfo,
            photoUrl: photoUrl
          },
          language: resumeData.language
        };
        setResumeData(nextData);
        setDebouncedResumeData(nextData);
        return;
      }
    } catch (e) {
      // Not JSON, fallback to existing naive heuristic
    }

    // MVP Heuristic: Extract first line as Name, look for emails, and set rest as summary.
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    
    let fullName = lines[0] || resumeData.personalInfo.fullName;
    let email = resumeData.personalInfo.email;
    let summaryParts = [];
    
    // Simple email regex test
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (let i = 1; i < lines.length; i++) {
        if (emailRegex.test(lines[i])) {
            email = lines[i];
        } else {
            summaryParts.push(lines[i]);
        }
    }

    setResumeData({
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, fullName, email },
      summary: summaryParts.join('\n') || resumeData.summary
    });
  };

  const handleExport = () => {
    // Remove the targetJobDescription from export to keep it strictly resume content
    const { targetJobDescription, ...exportData } = resumeData;
    const dataStr = encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + dataStr;
    a.download = 'resume_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const t = getTranslation(resumeData.language).app;

  const handleTranslate = async (targetLang: 'en' | 'fr') => {
    const online = await apiService.checkHealth();
    const isCloudConnected = online && apiService.isLoggedIn();
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!apiKey && !isCloudConnected) {
      alert(t.translationError);
      setShowSettings(true);
      return;
    }

    setIsTranslating(true);
    try {
      const { targetJobDescription, ...dataToTranslate } = resumeData;
      let translatedJson = '';

      if (isCloudConnected) {
        // Secure call proxied through AI Gateway
        const systemInstruction = `You are a professional resume translation assistant. Translate the following CV JSON structure into ${targetLang === 'en' ? 'English' : 'French'}. Preserve all JSON keys exactly and output ONLY valid JSON without any wrapper markdown.`;
        const userPrompt = JSON.stringify(dataToTranslate);
        
        translatedJson = await apiService.proxyLlm(systemInstruction, userPrompt, 'GEMINI');
        // Clean potential wrapper tags from AI response
        if (translatedJson.startsWith('```')) {
          translatedJson = translatedJson.replace(/^```json\n?|```$/g, '').trim();
        }
      } else {
        translatedJson = await translateResumeWithGemini(apiKey!, JSON.stringify(dataToTranslate), targetLang);
      }
      
      const parsedData = JSON.parse(translatedJson);
      
      setResumeData({
        ...resumeData,
        ...parsedData,
        targetJobDescription: resumeData.targetJobDescription,
        language: targetLang,
      });
    } catch (e) {
      alert(t.translationError);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        handleImport(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input to allow re-upload 
  };

  if (cloudState === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 gap-3">
        <Loader2 size={28} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-medium">
          {resumeData.language === 'fr' ? 'Connexion au serveur Cloud...' : 'Connecting to Cloud server...'}
        </p>
      </div>
    );
  }

  if (cloudState === 'online' && !isLoggedIn && !offlineBypass) {
    return (
      <CloudLoginPage
        language={resumeData.language}
        onLanguageChange={(lang) => setResumeData({ ...resumeData, language: lang })}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onLoginSuccess={() => setIsLoggedIn(true)}
        onContinueOffline={() => setOfflineBypass(true)}
      />
    );
  }

  const renderPdfStudio = (compactHeader = false) => (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors">
      <header className={`${compactHeader ? 'px-3 py-1.5' : 'px-3 sm:px-6 py-2.5 sm:py-3'} border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex flex-wrap items-center justify-between gap-2 transition-colors shrink-0`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Tab switch: CV vs Lettre */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewTab('cv')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                previewTab === 'cv'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              📄 {resumeData.language === 'fr' ? 'Mon CV' : 'My CV'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('cl')}
              className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                previewTab === 'cl'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              ✉️ {resumeData.language === 'fr' ? 'Lettre' : 'Cover Letter'}
            </button>
          </div>

          {/* Toggle Style Controls Button */}
          {previewTab === 'cv' && (
            <button
              type="button"
              onClick={() => setShowStyleControls(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                showStyleControls
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
              title={resumeData.language === 'fr' ? 'Ajuster les styles, couleurs et modèles' : 'Adjust styles and templates'}
            >
              <Palette size={13} className="text-indigo-500" />
              <span>{resumeData.language === 'fr' ? 'Style & Design' : 'Style & Design'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${showStyleControls ? 'rotate-180' : ''}`} />
            </button>
          )}

          {isGeneratingPreview && (
            <span className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full font-medium border border-indigo-100 dark:border-indigo-900/50 animate-pulse">
              <Loader2 size={11} className="animate-spin text-indigo-500" />
              <span>{resumeData.language === 'fr' ? 'Calcul...' : 'Syncing...'}</span>
            </span>
          )}

          {cvSaveStatus !== 'idle' && (
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              cvSaveStatus === 'saving'
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 animate-pulse'
                : cvSaveStatus === 'saved'
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                : 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
            }`}>
              <span>
                {cvSaveStatus === 'saving' && (resumeData.language === 'fr' ? 'Enregistrement...' : 'Saving...')}
                {cvSaveStatus === 'saved' && (resumeData.language === 'fr' ? 'Enregistré' : 'Saved')}
                {cvSaveStatus === 'error' && (resumeData.language === 'fr' ? 'Erreur' : 'Error')}
              </span>
            </span>
          )}
        </div>

        <PDFDownloadLink
          document={memoizedPdfDocument}
          fileName={
            previewTab === 'cv'
              ? `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`
              : `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Cover_Letter.pdf`
          }
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-1.5 rounded-lg shadow-xs text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          {({ loading }) => (loading ? t.generatingPdf : t.downloadPdf)}
        </PDFDownloadLink>
      </header>

      {/* Collapsible Style Controls */}
      {previewTab === 'cv' && showStyleControls && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-150 border-b border-gray-200 dark:border-gray-800">
          <StyleControls
            settings={resumeData.styleSettings || {
              template: 'classic',
              themeColor: 'slate',
              fontFamily: 'Helvetica',
              fontSize: 'medium'
            }}
            onChange={(newSettings) => setResumeData({ ...resumeData, styleSettings: newSettings })}
            language={resumeData.language}
          />
        </div>
      )}

      {/* PDF Viewport */}
      <main className="flex-1 min-h-[420px] overflow-hidden p-0 bg-gray-200 dark:bg-gray-900 flex flex-col transition-colors">
        <PDFViewer width="100%" height="100%" className="border-none flex-1 min-h-[420px]">
          {memoizedPdfDocument}
        </PDFViewer>
      </main>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden transition-colors duration-200">
      {/* Top Main Navigation Bar */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center gap-2 bg-gray-900 text-white shadow-md z-20 shrink-0">
        {/* Left: Brand Logo & Version Trigger */}
        <div className="flex items-center gap-2 sm:gap-4">
          <h1 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
            <span className="text-indigo-400">ATS</span>
            <span className="hidden sm:inline">ResumeBuilder</span>
          </h1>

          {/* Version Trigger Dropdown Button */}
          <button
            type="button"
            onClick={() => setShowVersionModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-750 text-gray-200 border border-gray-700/80 transition-colors cursor-pointer"
            title={resumeData.language === 'fr' ? 'Gérer les versions de CV' : 'Manage CV versions'}
          >
            <FolderOpen size={14} className="text-indigo-400 shrink-0" />
            <span className="max-w-[110px] sm:max-w-[160px] truncate font-semibold">
              {activeVersion?.name || (resumeData.language === 'fr' ? 'CV actif' : 'Active CV')}
            </span>
            {activeVersion && (activeVersion as any).isLocked && <span className="text-[10px]">🔒</span>}
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Center: Desktop Segmented Control Workflow Modes */}
        <nav className="hidden md:flex bg-gray-800/90 p-1 rounded-xl border border-gray-700/80 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setWorkflowTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              workflowTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <FileIcon size={14} />
            <span>{resumeData.language === 'fr' ? 'Éditeur CV' : 'CV Editor'}</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkflowTab('ats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              workflowTab === 'ats'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Target size={14} />
            <span>{resumeData.language === 'fr' ? 'Matching ATS' : 'ATS Matching'}</span>
            {atsResult.targetKeywords.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                workflowTab === 'ats' ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-900/60 text-indigo-300'
              }`}>
                {atsResult.matchScore}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setWorkflowTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              workflowTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Eye size={14} />
            <span>{resumeData.language === 'fr' ? 'Aperçu & Export' : 'Preview & Export'}</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkflowTab('tracker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              workflowTab === 'tracker'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Briefcase size={14} />
            <span>{resumeData.language === 'fr' ? 'Candidatures' : 'Tracker'}</span>
          </button>
        </nav>

        {/* Right: Actions, Theme, Language, Cloud, Settings */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2.5 items-center text-xs sm:text-sm font-medium">
          {isTranslating ? (
            <span className="flex items-center text-yellow-400 bg-gray-800 px-2.5 py-1 rounded text-xs animate-pulse">
              <Loader2 size={14} className="animate-spin mr-1.5" /> {t.translating}
            </span>
          ) : (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800 p-0.5 rounded" title={t.translateResume}>
              <span className="text-gray-400 px-1.5 flex items-center text-xs uppercase">
                <Languages size={13} className="sm:mr-1" />
                <span className="hidden 2xl:inline">{t.translateResume}:</span>
              </span>
              <button 
                type="button"
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs transition-colors hover:bg-gray-700 text-gray-300 cursor-pointer"
                onClick={() => handleTranslate('en')}
              >
                EN
              </button>
              <button 
                type="button"
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs transition-colors hover:bg-gray-700 text-gray-300 cursor-pointer"
                onClick={() => handleTranslate('fr')}
              >
                FR
              </button>
            </div>
          )}
          
          <div className="h-5 w-px bg-gray-700 hidden sm:block"></div>

          <button 
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white cursor-pointer"
            title={resumeData.language === 'fr' ? 'Changer de thème' : 'Switch Theme'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button 
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white cursor-pointer"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          {cloudState === 'online' && isLoggedIn && (
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 px-2 py-1 rounded-full text-xs">
              <Cloud size={13} className="text-emerald-400 shrink-0" />
              <span className="hidden sm:inline max-w-[120px] truncate" title={apiService.getEmail()}>
                {apiService.getEmail()}
              </span>
              <button
                type="button"
                onClick={() => apiService.logout()}
                className="text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                title={resumeData.language === 'fr' ? 'Se déconnecter' : 'Log out'}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          <div className="flex gap-0.5 bg-gray-800 p-0.5 rounded text-xs">
            <button 
              type="button"
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${resumeData.language === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setResumeData({...resumeData, language: 'en'})}
            >
              EN
            </button>
            <button 
              type="button"
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${resumeData.language === 'fr' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setResumeData({...resumeData, language: 'fr'})}
            >
              FR
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body based on Active Workflow Tab */}
      <div className="flex-1 flex overflow-hidden">
        {/* MODE 1: ÉDITEUR CV */}
        {workflowTab === 'editor' && (
          <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden w-full">
            <div className={`flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 bg-gray-50 dark:bg-gray-950 transition-all ${
              showLivePreviewInEditor ? 'xl:w-1/2 xl:border-r border-gray-200 dark:border-gray-800' : 'w-full'
            }`}>
              <div className={showLivePreviewInEditor ? 'w-full' : 'max-w-4xl mx-auto w-full'}>
                {/* Editor Header Bar with Quick Import/Export and Live Preview Toggle */}
                <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {resumeData.language === 'fr' ? 'Rédaction du CV' : 'CV Editor'}
                    </h2>
                    <p className="text-gray-500 text-xs dark:text-gray-400">{t.subtitle}</p>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                    <label className="text-[11px] sm:text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer">
                      {resumeData.language === 'fr' ? 'Importer JSON' : 'Import JSON'}
                      <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button 
                      type="button"
                      onClick={handleExport}
                      className="text-[11px] sm:text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                    >
                      {resumeData.language === 'fr' ? 'Exporter JSON' : 'Export JSON'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowImportOpen(true)}
                      className="text-[11px] sm:text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                    >
                      {t.quickImport}
                    </button>

                    {/* Wide Screen Side-by-Side Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowLivePreviewInEditor(prev => !prev)}
                      className="hidden xl:flex items-center gap-1.5 text-[11px] sm:text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750 transition cursor-pointer"
                      title={showLivePreviewInEditor ? 'Masquer l’aperçu PDF latéral' : 'Afficher l’aperçu PDF en direct côte-à-côte'}
                    >
                      <Columns size={12} className="text-indigo-500" />
                      <span>{showLivePreviewInEditor ? (resumeData.language === 'fr' ? 'Pleine largeur' : 'Full width') : (resumeData.language === 'fr' ? 'Aperçu côte-à-côte' : 'Split preview')}</span>
                    </button>
                  </div>
                </div>

                <ResumeForm 
                  data={resumeData} 
                  onChange={setResumeData} 
                  missingKeywords={atsResult.missingKeywords} 
                  activeVersion={activeVersion}
                  setActiveVersion={setActiveVersion}
                  onOpenVersions={() => setShowVersionModal(true)}
                />
              </div>
            </div>

            {/* Optional Live Side Preview in Editor on Wide Screens */}
            {showLivePreviewInEditor && (
              <div className="hidden xl:flex xl:w-1/2 h-full overflow-hidden flex-col">
                {renderPdfStudio(true)}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: MATCHING ATS & OFFRE D'EMPLOI */}
        {workflowTab === 'ats' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden w-full">
            <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 p-3 sm:p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span>{resumeData.language === 'fr' ? 'Atelier d’Optimisation ATS' : 'ATS Optimization Studio'}</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Score : {atsResult.matchScore}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {resumeData.language === 'fr'
                    ? "Collez la description de l'offre ciblée pour extraire les mots-clés décisifs et aligner votre CV en temps réel."
                    : "Paste the targeted job description to extract decisive keywords and align your resume in real time."}
                </p>
              </div>

              <OptimizationDashboard 
                data={resumeData} 
                onChange={setResumeData} 
                result={atsResult} 
                setAiKeywords={setAiKeywords} 
              />
            </div>

            {/* Live Side PDF Preview in ATS Studio */}
            <div className="hidden lg:flex lg:w-1/2 h-full overflow-hidden flex-col">
              {renderPdfStudio(true)}
            </div>
          </div>
        )}

        {/* MODE 3: APERÇU & EXPORT PLEIN ÉCRAN */}
        {workflowTab === 'preview' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
            {renderPdfStudio(false)}
          </div>
        )}

        {/* MODE 4: SUIVI DES CANDIDATURES (TRACKER) */}
        {workflowTab === 'tracker' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50 dark:bg-gray-950 h-full w-full">
            {selectedApplication ? (
              <ApplicationDetail 
                application={selectedApplication} 
                activeResumeData={resumeData}
                onBack={() => setSelectedApplication(null)}
                onUpdate={async (updated) => {
                  setSelectedApplication(updated);
                  try {
                    const online = await apiService.checkHealth();
                    if (online && apiService.isLoggedIn()) {
                      const saved = await apiService.saveApplication(updated);
                      setSelectedApplication(saved);
                      return;
                    }
                  } catch (err) {
                    console.warn("Cloud save failed, saving to local storage fallback", err);
                  }

                  const stored = localStorage.getItem('ats_applications_tracker');
                  if (stored) {
                    const parsed = JSON.parse(stored) as JobApplication[];
                    const next = parsed.map(app => app.id === updated.id ? updated : app);
                    try {
                      localStorage.setItem('ats_applications_tracker', JSON.stringify(next));
                    } catch (e: any) {
                      console.error('Error updating application in localStorage:', e);
                      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                        alert(resumeData.language === 'fr'
                          ? "Erreur : Mémoire locale saturée. Impossible d'enregistrer la candidature."
                          : "Error: Local storage is full. Unable to save the application updates.");
                      }
                    }
                  }
                }}
                language={resumeData.language}
              />
            ) : (
              <ApplicationTracker 
                activeResumeData={resumeData} 
                onSelectApplication={setSelectedApplication} 
                language={resumeData.language}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile / Small Screen Bottom Navigation Bar (4 Modes) */}
      <nav className="md:hidden shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 grid grid-cols-4 z-20 shadow-lg">
        <button
          type="button"
          onClick={() => setWorkflowTab('editor')}
          className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            workflowTab === 'editor'
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <FileIcon size={16} />
          <span>{resumeData.language === 'fr' ? 'Éditeur' : 'Editor'}</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkflowTab('ats')}
          className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors cursor-pointer relative ${
            workflowTab === 'ats'
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <Target size={16} />
            {atsResult.targetKeywords.length > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {atsResult.matchScore}%
              </span>
            )}
          </div>
          <span>ATS</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkflowTab('preview')}
          className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            workflowTab === 'preview'
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Eye size={16} />
          <span>{resumeData.language === 'fr' ? 'Aperçu' : 'Preview'}</span>
        </button>

        <button
          type="button"
          onClick={() => setWorkflowTab('tracker')}
          className={`flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            workflowTab === 'tracker'
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-t-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Briefcase size={16} />
          <span>{resumeData.language === 'fr' ? 'Candidatures' : 'Tracker'}</span>
        </button>
      </nav>

      {/* Floating AI Chat Assistant */}
      <AIChatWidget
        resumeData={resumeData}
        selectedApplication={selectedApplication}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Modals */}
      <ImportModal 
        isOpen={showImportOpen} 
        onClose={() => setShowImportOpen(false)} 
        onImport={handleImport} 
        language={resumeData.language} 
      />
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        language={resumeData.language} 
      />

      <VersionManager
        data={resumeData}
        onLoad={setResumeData}
        language={resumeData.language}
        activeVersion={activeVersion}
        setActiveVersion={setActiveVersion}
        isOpenModal={showVersionModal}
        onCloseModal={() => setShowVersionModal(false)}
      />
    </div>
  );
}

export default App;
