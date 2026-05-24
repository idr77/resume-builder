import React, { useState, useEffect } from 'react';
import type { JobApplication, ApplicationStatus } from '../../types/tracker';
import type { ResumeData } from '../../types/resume';
import { Search, Briefcase, Plus, Download, Upload, Trash2, Calendar, CheckSquare } from 'lucide-react';

interface Props {
  activeResumeData: ResumeData;
  onSelectApplication: (app: JobApplication) => void;
  language: 'en' | 'fr';
}

const statusColors: Record<ApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  applied: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800',
  interviewing: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-800',
  offer: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-800'
};

export default function ApplicationTracker({ activeResumeData, onSelectApplication, language }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Application Form State
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState(activeResumeData.targetJobDescription || '');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = () => {
    try {
      const stored = localStorage.getItem('ats_applications_tracker');
      if (stored) {
        setApplications(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading applications tracker', e);
    }
  };

  const saveApplications = (updated: JobApplication[]) => {
    localStorage.setItem('ats_applications_tracker', JSON.stringify(updated));
    setApplications(updated);
  };

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !roleTitle.trim()) return;

    const newApp: JobApplication = {
      id: Date.now().toString(),
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      jobDescription: jobDescription.trim(),
      appliedDate: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
      status: 'draft',
      interviewSteps: [],
      resumeDataUsed: activeResumeData
    };

    const updated = [newApp, ...applications];
    saveApplications(updated);
    
    // Reset Form
    setCompanyName('');
    setRoleTitle('');
    setJobDescription('');
    setShowAddForm(false);
  };

  const handleDeleteApplication = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card selection click
    const confirmMsg = language === 'fr' 
      ? "Supprimer définitivement cette candidature ?" 
      : "Are you sure you want to delete this application?";
    if (!window.confirm(confirmMsg)) return;

    const updated = applications.filter(app => app.id !== id);
    saveApplications(updated);
  };

  // Import / Export JSON Logic
  const handleExportData = () => {
    const dataStr = encodeURIComponent(JSON.stringify(applications, null, 2));
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + dataStr;
    a.download = 'job_applications_tracker.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const confirmMsg = language === 'fr'
            ? "Importer ces candidatures ? Cela remplacera votre liste locale actuelle."
            : "Import applications? This will replace your current local list.";
          if (!window.confirm(confirmMsg)) return;

          saveApplications(parsed);
        } else {
          alert(language === 'fr' ? "Format JSON invalide. Doit être un tableau." : "Invalid JSON format. Must be an array.");
        }
      } catch (err) {
        alert(language === 'fr' ? "Échec de la lecture du fichier." : "Error reading file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input uploader uploader
  };

  const isFrench = language === 'fr';

  const filteredApps = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = app.companyName.toLowerCase().includes(searchLower) ||
                          app.roleTitle.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
      
      {/* Tracker Controls */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex gap-2">
          <button 
            onClick={handleExportData}
            className="flex items-center gap-1 text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 font-bold transition cursor-pointer"
            title={isFrench ? "Exporter en JSON" : "Export to JSON"}
          >
            <Download size={12} />
            {isFrench ? 'Exporter' : 'Export'}
          </button>
          <label className="flex items-center gap-1 text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 font-bold transition cursor-pointer">
            <Upload size={12} />
            {isFrench ? 'Importer' : 'Import'}
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <Plus size={14} />
          {isFrench ? 'Nouvelle Candidature' : 'New Application'}
        </button>
      </div>

      {/* Quick Add Application Form */}
      {showAddForm && (
        <form onSubmit={handleCreateApplication} className="bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-950 p-4 rounded-lg shadow-md space-y-3 animate-fade-in transition-colors">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{isFrench ? 'ENTREPRISE' : 'COMPANY'}</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Google, Stripe..."
                className="w-full p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{isFrench ? 'INTITULÉ DU POSTE' : 'ROLE TITLE'}</label>
              <input 
                type="text" 
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Senior React Developer..."
                className="w-full p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
          </div>
          <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">{isFrench ? 'DESCRIPTION DE POSTE' : 'JOB DESCRIPTION'}</label>
            <textarea 
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder={isFrench ? "Collez la description ici..." : "Paste the job description here..."}
              className="w-full h-16 p-2 text-xs bg-white text-gray-900 border border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {isFrench ? 'Annuler' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-sm transition-colors"
            >
              {isFrench ? 'Ajouter' : 'Add Application'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Panel */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFrench ? "Rechercher une entreprise, un poste..." : "Search company, job..."}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:border-indigo-500 transition shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 text-xs border border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:border-indigo-500 shadow-sm"
        >
          <option value="all">{isFrench ? 'Tous les statuts' : 'All Status'}</option>
          <option value="draft">{isFrench ? 'Brouillon' : 'Draft'}</option>
          <option value="applied">{isFrench ? 'Candidaté' : 'Applied'}</option>
          <option value="interviewing">{isFrench ? 'Entretien en cours' : 'Interviewing'}</option>
          <option value="offer">{isFrench ? 'Offre Reçue 🎉' : 'Offer Received 🎉'}</option>
          <option value="rejected">{isFrench ? 'Refusé' : 'Rejected'}</option>
        </select>
      </div>

      {/* Applications list */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 italic">
            <Briefcase size={36} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
            {isFrench ? 'Aucune candidature trouvée.' : 'No applications found.'}
          </div>
        ) : (
          filteredApps.map(app => {
            const stepsCount = app.interviewSteps.length;
            const completedSteps = app.interviewSteps.filter(s => s.status === 'completed').length;
            
            return (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-900 transition-all cursor-pointer flex justify-between items-start"
              >
                <div className="space-y-2 min-w-0 mr-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{app.companyName}</h3>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{app.roleTitle}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {app.appliedDate}
                    </span>
                    {stepsCount > 0 && (
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">
                        <CheckSquare size={11} />
                        {completedSteps}/{stepsCount} {isFrench ? 'entretiens' : 'interviews'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                  <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-full capitalize ${statusColors[app.status]}`}>
                    {app.status}
                  </span>
                  
                  <button
                    onClick={(e) => handleDeleteApplication(app.id, e)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                    title={isFrench ? "Supprimer la candidature" : "Delete application"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
