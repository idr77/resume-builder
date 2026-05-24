import { useState } from 'react';
import type { ResumeData, Experience, Education } from '../../types/resume';
import { ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Loader2, FileText } from 'lucide-react';
import { getTranslation } from '../../i18n/translations';
import AIRewriteModal from './AIRewriteModal';
import AIGlobalOptimizeModal from './AIGlobalOptimizeModal';
import VersionManager from './VersionManager';
import { generateSkillsFromExperienceWithGemini, generateCoverLetterWithGemini } from '../../utils/geminiApiService';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  missingKeywords?: string[];
}

export default function ResumeForm({ data, onChange, missingKeywords = [] }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('personal');
  const [rewriteIndex, setRewriteIndex] = useState<string | null>(null);
  const [rewriteSkillsOpen, setRewriteSkillsOpen] = useState(false);
  const [globalOptimizeOpen, setGlobalOptimizeOpen] = useState(false);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [e.target.name]: e.target.value }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...data,
          personalInfo: { ...data.personalInfo, photoUrl: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldChange = (field: keyof ResumeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Generic helpers for arrays (Experience, Education, resumeLanguages)
  const addArrayItem = (field: 'experience' | 'education' | 'resumeLanguages', newItem: any) => {
    onChange({ ...data, [field]: [...data[field], newItem] as any });
  };

  const updateArrayItem = (field: 'experience' | 'education' | 'resumeLanguages', id: string, updatedFields: any) => {
    const newData = data[field].map((item: any) => item.id === id ? { ...item, ...updatedFields } : item);
    onChange({ ...data, [field]: newData as any });
  };

  const removeArrayItem = (field: 'experience' | 'education' | 'resumeLanguages', id: string) => {
    onChange({ ...data, [field]: data[field].filter((item: any) => item.id !== id) as any });
  };

  const handleGenerateSkillsFromExperience = async () => {
    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        alert(data.language === 'fr' ? "Clé API Gemini manquante. Allez dans les paramètres." : "Missing Gemini API Key. Go to Settings.");
        return;
      }
      setIsGeneratingSkills(true);
      const newSkillsText = await generateSkillsFromExperienceWithGemini(apiKey, data.experience, data.language);
      if (newSkillsText) {
         const newNames = newSkillsText.split(',').map(s => s.trim()).filter(Boolean);
         const currentNames = data.skills.map(s => s.name);
         const combined = Array.from(new Set([...currentNames, ...newNames]));
         handleFieldChange('skills', combined.map((name, i) => ({ id: `sk-${i}`, name })));
      }
    } catch (e) {
      alert(data.language === 'fr' ? "Erreur lors de la génération." : "Error generating skills.");
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        alert(data.language === 'fr' ? "Clé API Gemini manquante. Allez dans les paramètres." : "Missing Gemini API Key. Go to Settings.");
        return;
      }
      setIsGeneratingCoverLetter(true);
      
      const { coverLetter, ...resumeJsonPayload } = data;
      const letter = await generateCoverLetterWithGemini(apiKey, JSON.stringify(resumeJsonPayload), data.targetJobDescription || '', data.language);
      handleFieldChange('coverLetter', letter);
      setOpenSection('coverLetter');
    } catch (e) {
      alert(data.language === 'fr' ? "Erreur." : "Error generating cover letter.");
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const t = getTranslation(data.language).form;

  return (
    <div className="space-y-4">
      <VersionManager data={data} onLoad={onChange} language={data.language} />

      <button 
        onClick={() => setGlobalOptimizeOpen(true)}
        className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg font-medium shadow-sm transition cursor-pointer"
      >
        <Sparkles size={18} /> {data.language === 'fr' ? 'Optimisation Globale avec IA' : 'Global AI Optimization'}
      </button>

      {/* PERSONAL INFO SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('personal')}
        >
          <span>{t.personalInfo}</span>
          {openSection === 'personal' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'personal' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-4 bg-white dark:bg-gray-900">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.fullName}</label>
              <input type="text" name="fullName" value={data.personalInfo.fullName} onChange={handlePersonalInfoChange} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.jobTitle}</label>
              <input type="text" name="jobTitle" value={data.personalInfo.jobTitle} onChange={handlePersonalInfoChange} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.email} <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={data.personalInfo.email} onChange={handlePersonalInfoChange} className={`w-full p-2 bg-white text-gray-900 border ${!data.personalInfo.email ? 'border-red-300 dark:border-red-900/60' : 'border-gray-300 dark:border-gray-700'} rounded dark:bg-gray-950 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.phone} <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={data.personalInfo.phone} onChange={handlePersonalInfoChange} className={`w-full p-2 bg-white text-gray-900 border ${!data.personalInfo.phone ? 'border-red-300 dark:border-red-900/60' : 'border-gray-300 dark:border-gray-700'} rounded dark:bg-gray-950 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.location}</label>
              <input type="text" name="location" value={data.personalInfo.location} onChange={handlePersonalInfoChange} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.linkedin}</label>
              <input type="text" name="linkedin" value={data.personalInfo.linkedin || ''} onChange={handlePersonalInfoChange} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.portfolio}</label>
              <input type="text" name="portfolio" value={data.personalInfo.portfolio || ''} onChange={handlePersonalInfoChange} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t.photoUpload}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoUpload} 
                  className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer border border-gray-200 dark:border-gray-800 p-1 rounded" 
                />
                <input 
                  type="text" 
                  name="photoUrl" 
                  value={data.personalInfo.photoUrl || ''} 
                  onChange={handlePersonalInfoChange} 
                  placeholder={t.photoPlaceholder} 
                  className="flex-1 p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('summary')}
        >
          <span>{t.summary}</span>
          {openSection === 'summary' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'summary' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <textarea 
              value={data.summary} 
              onChange={(e) => handleFieldChange('summary', e.target.value)} 
              rows={4}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              placeholder={t.summaryPlaceholder}
            />
          </div>
        )}
      </div>

      {/* EXPERIENCE SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('experience')}
        >
          <span>{t.experience}</span>
          {openSection === 'experience' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'experience' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-6 bg-white dark:bg-gray-900">
            {data.experience.map((exp: Experience) => (
              <div key={exp.id} className="relative p-4 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-800">
                <button 
                  onClick={() => removeArrayItem('experience', exp.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.company}</label>
                    <input type="text" value={exp.company} onChange={(e) => updateArrayItem('experience', exp.id, {company: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.role}</label>
                    <input type="text" value={exp.role} onChange={(e) => updateArrayItem('experience', exp.id, {role: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.location}</label>
                    <input type="text" placeholder={data.language === 'fr' ? 'Ville, Pays' : 'City, Country'} value={exp.location || ''} onChange={(e) => updateArrayItem('experience', exp.id, {location: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.startDate}</label>
                    <input type="text" placeholder="MM/YYYY" value={exp.startDate} onChange={(e) => updateArrayItem('experience', exp.id, {startDate: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.endDate}</label>
                    <input type="text" placeholder="MM/YYYY or Present" value={exp.endDate} onChange={(e) => updateArrayItem('experience', exp.id, {endDate: e.target.value})} disabled={exp.current} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-900/60 transition-colors" />
                    <label className="flex items-center mt-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={exp.current} onChange={(e) => updateArrayItem('experience', exp.id, {current: e.target.checked, endDate: e.target.checked ? 'Present' : exp.endDate})} className="mr-2 accent-indigo-600 dark:accent-indigo-500" />
                      {t.currentJob}
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.descriptionBullet}</label>
                    <textarea value={exp.description} onChange={(e) => updateArrayItem('experience', exp.id, {description: e.target.value})} rows={3} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                    <button
                      onClick={() => setRewriteIndex(exp.id)}
                      className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded transition w-max cursor-pointer"
                    >
                      <Sparkles size={12} /> {data.language === 'fr' ? 'Optimiser avec IA' : 'Optimize with AI'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('experience', { id: Date.now().toString(), company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' })}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              <Plus size={16} className="mr-1" /> {t.addExperience}
            </button>
          </div>
        )}
      </div>

       {/* EDUCATION SECTION */}
       <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('education')}
        >
          <span>{t.education}</span>
          {openSection === 'education' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'education' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-6 bg-white dark:bg-gray-900">
            {data.education.map((edu: Education) => (
              <div key={edu.id} className="relative p-4 border border-gray-200 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-800">
                <button 
                  onClick={() => removeArrayItem('education', edu.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.school}</label>
                    <input type="text" value={edu.school} onChange={(e) => updateArrayItem('education', edu.id, {school: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.degree}</label>
                    <input type="text" value={edu.degree} onChange={(e) => updateArrayItem('education', edu.id, {degree: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.startDate}</label>
                    <input type="text" placeholder="YYYY" value={edu.startDate} onChange={(e) => updateArrayItem('education', edu.id, {startDate: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t.endDate}</label>
                    <input type="text" placeholder="YYYY" value={edu.endDate} onChange={(e) => updateArrayItem('education', edu.id, {endDate: e.target.value})} className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                    <textarea value={edu.description} onChange={(e) => updateArrayItem('education', edu.id, {description: e.target.value})} rows={2} className="w-full p-2 bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('education', { id: Date.now().toString(), school: '', degree: '', startDate: '', endDate: '', description: '' })}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
            >
              <Plus size={16} className="mr-1" /> {t.addEducation}
            </button>
          </div>
        )}
      </div>

      {/* SKILLS & INTERESTS */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('tags')}
        >
          <span>{t.skillsInterests}</span>
          {openSection === 'tags' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'tags' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
             <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t.skills}</label>
              <textarea 
                value={data.skills.map(s => s.name).join(',')} 
                onChange={(e) => {
                  const items = e.target.value.split(',');
                  handleFieldChange('skills', items.map((name, i) => ({ id: `sk-${i}`, name })));
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                rows={2}
                placeholder={t.skillsPlaceholder}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => setRewriteSkillsOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded transition w-max cursor-pointer"
                >
                  <Sparkles size={12} /> {data.language === 'fr' ? 'Optimiser avec IA' : 'Optimize with AI'}
                </button>
                <button
                  onClick={handleGenerateSkillsFromExperience}
                  disabled={isGeneratingSkills || data.experience.length === 0}
                  className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded transition w-max disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingSkills ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {data.language === 'fr' ? 'Générer depuis les expériences' : 'Generate from Experience'}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t.languages}</label>
              {data.resumeLanguages.map((lang) => (
                <div key={lang.id} className="grid grid-cols-4 gap-2 mb-2 relative pr-8">
                  <div className="col-span-2">
                    <input type="text" value={lang.name} placeholder="English, Français..." onChange={(e) => updateArrayItem('resumeLanguages', lang.id, { name: e.target.value })} className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                  </div>
                  <div className="col-span-2 relative flex items-center pr-2">
                    <select value={lang.level} onChange={(e) => updateArrayItem('resumeLanguages', lang.id, { level: Number(e.target.value) })} className="w-full p-2 text-xl tracking-widest border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-yellow-500 transition-colors">
                      <option value={1}>★☆☆</option>
                      <option value={2}>★★☆</option>
                      <option value={3}>★★★</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-1 text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <button onClick={() => removeArrayItem('resumeLanguages', lang.id)} className="absolute right-0 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 p-1 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addArrayItem('resumeLanguages', { id: Date.now().toString(), name: '', level: 2 })}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold mt-1 cursor-pointer"
              >
                <Plus size={16} className="mr-1" /> {t.addLanguage}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t.interests}</label>
              <textarea 
                value={data.interests.map(i => i.name).join(',')} 
                onChange={(e) => {
                  const items = e.target.value.split(',');
                  handleFieldChange('interests', items.map((name, i) => ({ id: `int-${i}`, name })));
                }}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                rows={2}
                placeholder={t.interestsPlaceholder}
              />
            </div>
          </div>
        )}
      </div>

      {/* COVER LETTER SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer"
          onClick={() => toggleSection('coverLetter')}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-500 dark:text-gray-400" />
            <span>{data.language === 'fr' ? 'Lettre de Motivation' : 'Cover Letter'}</span>
          </div>
          {openSection === 'coverLetter' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'coverLetter' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
             <div className="mb-3 flex justify-end">
               <button
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingCoverLetter}
                  className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer disabled:opacity-50"
               >
                 {isGeneratingCoverLetter ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 {data.language === 'fr' ? 'Générer avec IA' : 'Generate with AI'}
               </button>
             </div>
             <textarea 
               value={data.coverLetter || ''} 
               onChange={(e) => handleFieldChange('coverLetter', e.target.value)} 
               rows={15}
               className="w-full p-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-sans text-sm resize-none"
               placeholder={data.language === 'fr' ? "Votre lettre de motivation apparaîtra ici..." : "Your cover letter will appear here..."}
             />
          </div>
        )}
      </div>

      <AIGlobalOptimizeModal
        isOpen={globalOptimizeOpen}
        onClose={() => setGlobalOptimizeOpen(false)}
        data={data}
        onApply={(newData) => onChange({ ...data, ...newData })}
      />

      <AIRewriteModal 
        isOpen={!!rewriteIndex}
        onClose={() => setRewriteIndex(null)}
        originalText={rewriteIndex ? data.experience.find(e => e.id === rewriteIndex)?.description || '' : ''}
        missingKeywords={missingKeywords}
        language={data.language}
        mode="experience"
        onApply={(newText) => {
          if (rewriteIndex) {
            updateArrayItem('experience', rewriteIndex, { description: newText });
          }
        }}
      />

      <AIRewriteModal 
        isOpen={rewriteSkillsOpen}
        onClose={() => setRewriteSkillsOpen(false)}
        originalText={data.skills.map(s => s.name).join(', ')}
        missingKeywords={missingKeywords}
        language={data.language}
        mode="skills"
        onApply={(newText) => {
          const items = newText.split(',');
          handleFieldChange('skills', items.map((name, i) => ({ id: `sk-${i}`, name: name.trim() })));
        }}
      />
    </div>
  );
}
