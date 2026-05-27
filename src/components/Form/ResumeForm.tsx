import { useState } from 'react';
import type { ResumeData, Experience, Education } from '../../types/resume';
import { ChevronDown, ChevronUp, Plus, Trash2, Sparkles, Loader2, FileText, X } from 'lucide-react';
import { getTranslation } from '../../i18n/translations';
import AIRewriteModal from './AIRewriteModal';
import AIGlobalOptimizeModal from './AIGlobalOptimizeModal';
import VersionManager from './VersionManager';
import { generateSkillsFromExperienceWithGemini, generateCoverLetterWithGemini } from '../../utils/geminiApiService';
import { compressImage } from '../../utils/imageCompressor';
import { ITSkillsDictionary } from '../../utils/itSkillsDictionary';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  missingKeywords?: string[];
  activeVersion: { id: string; name: string } | null;
  setActiveVersion: (ver: { id: string; name: string } | null) => void;
}

export default function ResumeForm({ data, onChange, missingKeywords = [], activeVersion, setActiveVersion }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('personal');
  const [rewriteIndex, setRewriteIndex] = useState<string | null>(null);
  const [rewriteSkillsOpen, setRewriteSkillsOpen] = useState(false);
  const [globalOptimizeOpen, setGlobalOptimizeOpen] = useState(false);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // States for interactive skills tags editor
  const [skillInput, setSkillInput] = useState('');
  const [isSkillFocused, setIsSkillFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const handleAddSkill = (skillName: string) => {
    const cleaned = skillName.trim();
    if (!cleaned) return;
    
    // Check if duplicate
    const isDuplicate = data.skills.some(s => s.name.toLowerCase() === cleaned.toLowerCase());
    if (isDuplicate) {
      setSkillInput('');
      return;
    }

    const newSkill = {
      id: `sk-${Date.now()}`,
      name: cleaned
    };
    
    handleFieldChange('skills', [...data.skills, newSkill]);
    setSkillInput('');
  };

  const getQuickRecommendations = () => {
    const popular = [
      "JavaScript", "TypeScript", "React", "Node.js", "Python", 
      "SQL", "Docker", "AWS", "Git", "Agile", "Management", "Communication"
    ];
    return popular.filter(skill => 
      !data.skills.some(s => s.name.toLowerCase() === skill.toLowerCase())
    ).slice(0, 6);
  };

  const suggestions = ITSkillsDictionary.filter(skill => {
    const isAlreadyAdded = data.skills.some(s => s.name.toLowerCase() === skill.toLowerCase());
    if (isAlreadyAdded) return false;
    return skill.toLowerCase().includes(skillInput.toLowerCase());
  }).slice(0, 8);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [e.target.name]: e.target.value }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressingPhoto(true);
      try {
        const compressed = await compressImage(file);
        onChange({
          ...data,
          personalInfo: { ...data.personalInfo, photoUrl: compressed }
        });
      } catch (err) {
        console.error('Error compressing image:', err);
        // Fallback to simple read if compression fails
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange({
            ...data,
            personalInfo: { ...data.personalInfo, photoUrl: reader.result as string }
          });
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingPhoto(false);
      }
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
      <VersionManager 
        data={data} 
        onLoad={onChange} 
        language={data.language} 
        activeVersion={activeVersion}
        setActiveVersion={setActiveVersion}
      />

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
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                {t.photoUpload}
                {isCompressingPhoto && <Loader2 size={14} className="animate-spin text-indigo-500" />}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoUpload} 
                  disabled={isCompressingPhoto}
                  className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer border border-gray-200 dark:border-gray-800 p-1 rounded disabled:opacity-50" 
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
             <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t.skills}</label>
              
              {/* Visual Tags for existing skills */}
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-40 overflow-y-auto p-1 bg-gray-50 dark:bg-gray-950/40 rounded-md border border-gray-100 dark:border-gray-800/80">
                {data.skills.map((skill) => (
                  <span 
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/40 font-semibold shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                  >
                    <span>{skill.name}</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated = data.skills.filter(s => s.id !== skill.id);
                        handleFieldChange('skills', updated);
                      }}
                      className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors focus:outline-none cursor-pointer"
                      title={data.language === 'fr' ? 'Supprimer' : 'Delete'}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {data.skills.length === 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic p-1">
                    {data.language === 'fr' ? 'Aucune compétence ajoutée.' : 'No skills added yet.'}
                  </span>
                )}
              </div>

              {/* Input field and Autocomplete Dropdown */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={skillInput}
                      onChange={(e) => {
                        setSkillInput(e.target.value);
                        setActiveSuggestionIndex(0);
                      }}
                      onFocus={() => setIsSkillFocused(true)}
                      onBlur={() => {
                        // Delay hide to allow clicks to register on dropdown items
                        setTimeout(() => setIsSkillFocused(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (suggestions.length > 0 && skillInput.trim()) {
                            const toAdd = suggestions[activeSuggestionIndex] || skillInput.trim();
                            handleAddSkill(toAdd);
                          } else if (skillInput.trim()) {
                            handleAddSkill(skillInput.trim());
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveSuggestionIndex(prev => Math.min(suggestions.length - 1, prev + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveSuggestionIndex(prev => Math.max(0, prev - 1));
                        } else if (e.key === ',' || e.key === ';') {
                          e.preventDefault();
                          if (skillInput.trim()) {
                            handleAddSkill(skillInput.trim());
                          }
                        }
                      }}
                      placeholder={data.language === 'fr' ? "Saisir une compétence (ex: React, Management...)" : "Enter a skill (e.g. React, Management...)"}
                      className="w-full p-2 text-sm bg-white text-gray-900 border border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (skillInput.trim()) {
                        handleAddSkill(skillInput.trim());
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    {data.language === 'fr' ? 'Ajouter' : 'Add'}
                  </button>
                </div>

                {/* Suggestions list */}
                {isSkillFocused && (skillInput.trim().length > 0 || suggestions.length > 0) && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={() => handleAddSkill(suggestion)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                          idx === activeSuggestionIndex 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <span>{suggestion}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                          {data.language === 'fr' ? 'Suggéré' : 'Suggested'}
                        </span>
                      </button>
                    ))}
                    {skillInput.trim() && !suggestions.some(s => s.toLowerCase() === skillInput.trim().toLowerCase()) && (
                      <button
                        key="create-custom-skill"
                        type="button"
                        onMouseDown={() => handleAddSkill(skillInput.trim())}
                        className="w-full text-left px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span>{data.language === 'fr' ? `Créer "${skillInput.trim()}"` : `Create "${skillInput.trim()}"`}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {data.language === 'fr' ? 'Personnalisé' : 'Custom'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Quick Recommendations */}
              {!skillInput.trim() && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                    {data.language === 'fr' ? 'Suggestions rapides :' : 'Quick recommendations:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {getQuickRecommendations().map(recSkill => (
                      <button
                        key={recSkill}
                        type="button"
                        onClick={() => handleAddSkill(recSkill)}
                        className="text-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 dark:bg-gray-850/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:border-gray-700/60 px-2 py-0.5 rounded transition cursor-pointer font-semibold"
                      >
                        + {recSkill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI action buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
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
