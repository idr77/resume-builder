import React, { useState } from 'react';
import type { ResumeData, Experience, Education, Skill, Interest } from '../../types/resume';
import { ChevronDown, ChevronUp, Plus, Trash2, Sparkles } from 'lucide-react';
import { getTranslation } from '../../i18n/translations';
import AIRewriteModal from './AIRewriteModal';

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  missingKeywords?: string[];
}

export default function ResumeForm({ data, onChange, missingKeywords = [] }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('personal');
  const [rewriteIndex, setRewriteIndex] = useState<string | null>(null);

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

  // Generic helpers for arrays (Experience, Education)
  const addArrayItem = (field: 'experience' | 'education', newItem: any) => {
    onChange({ ...data, [field]: [...data[field], newItem] });
  };

  const updateArrayItem = (field: 'experience' | 'education', id: string, updatedFields: any) => {
    const newData = data[field].map((item: any) => item.id === id ? { ...item, ...updatedFields } : item);
    onChange({ ...data, [field]: newData });
  };

  const removeArrayItem = (field: 'experience' | 'education', id: string) => {
    onChange({ ...data, [field]: data[field].filter((item: any) => item.id !== id) });
  };

  const t = getTranslation(data.language).form;

  return (
    <div className="space-y-4">
      {/* PERSONAL INFO SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
          onClick={() => toggleSection('personal')}
        >
          <span>{t.personalInfo}</span>
          {openSection === 'personal' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'personal' && (
          <div className="p-4 border-t border-gray-200 grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.fullName}</label>
              <input type="text" name="fullName" value={data.personalInfo.fullName} onChange={handlePersonalInfoChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.jobTitle}</label>
              <input type="text" name="jobTitle" value={data.personalInfo.jobTitle} onChange={handlePersonalInfoChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.email} <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={data.personalInfo.email} onChange={handlePersonalInfoChange} className={`w-full p-2 border ${!data.personalInfo.email ? 'border-red-300' : 'border-gray-300'} rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition`} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.phone} <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={data.personalInfo.phone} onChange={handlePersonalInfoChange} className={`w-full p-2 border ${!data.personalInfo.phone ? 'border-red-300' : 'border-gray-300'} rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition`} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.location}</label>
              <input type="text" name="location" value={data.personalInfo.location} onChange={handlePersonalInfoChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.linkedin}</label>
              <input type="text" name="linkedin" value={data.personalInfo.linkedin || ''} onChange={handlePersonalInfoChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.portfolio}</label>
              <input type="text" name="portfolio" value={data.personalInfo.portfolio || ''} onChange={handlePersonalInfoChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">{t.photoUpload}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoUpload} 
                  className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 p-1 rounded" 
                />
                <input 
                  type="text" 
                  name="photoUrl" 
                  value={data.personalInfo.photoUrl || ''} 
                  onChange={handlePersonalInfoChange} 
                  placeholder={t.photoPlaceholder} 
                  className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
          onClick={() => toggleSection('summary')}
        >
          <span>{t.summary}</span>
          {openSection === 'summary' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'summary' && (
          <div className="p-4 border-t border-gray-200">
            <textarea 
              value={data.summary} 
              onChange={(e) => handleFieldChange('summary', e.target.value)} 
              rows={4}
              className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              placeholder={t.summaryPlaceholder}
            />
          </div>
        )}
      </div>

      {/* EXPERIENCE SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
          onClick={() => toggleSection('experience')}
        >
          <span>{t.experience}</span>
          {openSection === 'experience' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'experience' && (
          <div className="p-4 border-t border-gray-200 space-y-6">
            {data.experience.map((exp: Experience, index: number) => (
              <div key={exp.id} className="relative p-4 border border-gray-200 rounded-md bg-gray-50">
                <button 
                  onClick={() => removeArrayItem('experience', exp.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.company}</label>
                    <input type="text" value={exp.company} onChange={(e) => updateArrayItem('experience', exp.id, {company: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.role}</label>
                    <input type="text" value={exp.role} onChange={(e) => updateArrayItem('experience', exp.id, {role: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.startDate}</label>
                    <input type="text" placeholder="MM/YYYY" value={exp.startDate} onChange={(e) => updateArrayItem('experience', exp.id, {startDate: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.endDate}</label>
                    <input type="text" placeholder="MM/YYYY or Present" value={exp.endDate} onChange={(e) => updateArrayItem('experience', exp.id, {endDate: e.target.value})} disabled={exp.current} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 disabled:bg-gray-100" />
                    <label className="flex items-center mt-2 text-xs text-gray-600">
                      <input type="checkbox" checked={exp.current} onChange={(e) => updateArrayItem('experience', exp.id, {current: e.target.checked, endDate: e.target.checked ? 'Present' : exp.endDate})} className="mr-2" />
                      {t.currentJob}
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.descriptionBullet}</label>
                    <textarea value={exp.description} onChange={(e) => updateArrayItem('experience', exp.id, {description: e.target.value})} rows={3} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                    <button
                      onClick={() => setRewriteIndex(exp.id)}
                      className="mt-2 flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition w-max"
                    >
                      <Sparkles size={12} /> {data.language === 'fr' ? 'Optimiser avec IA' : 'Optimize with AI'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('experience', { id: Date.now().toString(), company: '', role: '', startDate: '', endDate: '', current: false, description: '' })}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={16} className="mr-1" /> {t.addExperience}
            </button>
          </div>
        )}
      </div>

       {/* EDUCATION SECTION */}
       <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
          onClick={() => toggleSection('education')}
        >
          <span>{t.education}</span>
          {openSection === 'education' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'education' && (
          <div className="p-4 border-t border-gray-200 space-y-6">
            {data.education.map((edu: Education) => (
              <div key={edu.id} className="relative p-4 border border-gray-200 rounded-md bg-gray-50">
                <button 
                  onClick={() => removeArrayItem('education', edu.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.school}</label>
                    <input type="text" value={edu.school} onChange={(e) => updateArrayItem('education', edu.id, {school: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.degree}</label>
                    <input type="text" value={edu.degree} onChange={(e) => updateArrayItem('education', edu.id, {degree: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.startDate}</label>
                    <input type="text" placeholder="YYYY" value={edu.startDate} onChange={(e) => updateArrayItem('education', edu.id, {startDate: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.endDate}</label>
                    <input type="text" placeholder="YYYY" value={edu.endDate} onChange={(e) => updateArrayItem('education', edu.id, {endDate: e.target.value})} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea value={edu.description} onChange={(e) => updateArrayItem('education', edu.id, {description: e.target.value})} rows={2} className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500" />
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => addArrayItem('education', { id: Date.now().toString(), school: '', degree: '', startDate: '', endDate: '', description: '' })}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={16} className="mr-1" /> {t.addEducation}
            </button>
          </div>
        )}
      </div>

      {/* SKILLS & INTERESTS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button 
          className="w-full flex items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-50 transition"
          onClick={() => toggleSection('tags')}
        >
          <span>{t.skillsInterests}</span>
          {openSection === 'tags' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'tags' && (
          <div className="p-4 border-t border-gray-200">
             <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">{t.skills}</label>
              <textarea 
                value={data.skills.map(s => s.name).join(', ')} 
                onChange={(e) => {
                  const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  handleFieldChange('skills', items.map((name, i) => ({ id: `sk-${i}`, name })));
                }}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500" 
                rows={2}
                placeholder={t.skillsPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">{t.interests}</label>
              <textarea 
                value={data.interests.map(i => i.name).join(', ')} 
                onChange={(e) => {
                  const items = e.target.value.split(',').map(i => i.trim()).filter(Boolean);
                  handleFieldChange('interests', items.map((name, i) => ({ id: `int-${i}`, name })));
                }}
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500" 
                rows={2}
                placeholder={t.interestsPlaceholder}
              />
            </div>
          </div>
        )}
      </div>

      <AIRewriteModal 
        isOpen={!!rewriteIndex}
        onClose={() => setRewriteIndex(null)}
        originalText={rewriteIndex ? data.experience.find(e => e.id === rewriteIndex)?.description || '' : ''}
        missingKeywords={missingKeywords}
        language={data.language}
        onApply={(newText) => {
          if (rewriteIndex) {
            updateArrayItem('experience', rewriteIndex, { description: newText });
          }
        }}
      />
    </div>
  );
}
