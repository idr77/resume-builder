import React, { useState } from 'react';
import type { ResumeData } from '../../types/resume';
import { globalOptimizeResumeWithGemini } from '../../utils/geminiApiService';
import { Sparkles, Loader2, Upload, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData;
  onApply: (newData: Partial<ResumeData>) => void;
}

export default function AIGlobalOptimizeModal({ isOpen, onClose, data, onApply }: Props) {
  const [detailedDoc, setDetailedDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setDetailedDoc(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleOptimize = async () => {
    if (!detailedDoc.trim()) {
      setError(data.language === 'fr' ? 'Veuillez fournir un document détaillé.' : 'Please provide a detailed document.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) throw new Error('Missing Gemini API Key. Please add it in Settings.');

      // Extract parts we want to optimize to keep payload focused
      const payloadObj = {
        summary: data.summary,
        experience: data.experience
      };

      const optimizedJsonStr = await globalOptimizeResumeWithGemini(
        apiKey,
        JSON.stringify(payloadObj),
        detailedDoc,
        data.targetJobDescription || '',
        data.language
      );

      const parsed = JSON.parse(optimizedJsonStr);
      onApply(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during global optimization.');
    } finally {
      setLoading(false);
    }
  };

  const isFrench = data.language === 'fr';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50 rounded-t-xl">
          <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
            <Sparkles size={18} /> {isFrench ? 'Optimisation globale (IA)' : 'Global AI Optimization'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
           <p className="text-sm text-gray-600">
             {isFrench 
               ? "Téléchargez ou collez un document détaillé avec toutes vos expériences. L'IA réécrira le résumé et les expériences de votre CV en fonction de ce contenu " 
               : "Upload or paste a master document with all your detailed experiences. The AI will rewrite your resume's summary and experience sections based on it "}
             {data.targetJobDescription ? (isFrench ? "et de l'annonce cible." : "and the target Job Description.") : (isFrench ? "sans utiliser d'annonce spécifique." : "without a target Job Description.")}
           </p>

           <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
              <Upload size={24} className="text-gray-400 mb-2" />
              <label className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-sm">
                {isFrench ? 'Cliquez pour uploader un fichier texte (.txt)' : 'Click to upload a text file (.txt)'}
                <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
              </label>
           </div>

           <div className="flex items-center gap-2 text-gray-500 my-2 w-full">
             <div className="h-px bg-gray-200 flex-1"></div>
             <span className="text-xs uppercase font-semibold">{isFrench ? 'OU COLLER' : 'OR PASTE'}</span>
             <div className="h-px bg-gray-200 flex-1"></div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} />
                {isFrench ? 'Document détaillé des expériences' : 'Detailed Experiences Document'}
              </label>
              <textarea 
                value={detailedDoc}
                onChange={(e) => setDetailedDoc(e.target.value)}
                className="w-full h-48 p-3 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
                placeholder={isFrench ? "Saisissez ou collez votre document détaillé ici..." : "Type or paste your master document here..."}
              />
           </div>

           {error && <div className="p-3 bg-red-50 text-red-600 text-sm border border-red-200 rounded">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded bg-white hover:bg-gray-100">
            {isFrench ? 'Annuler' : 'Cancel'}
          </button>
          <button 
            onClick={handleOptimize} 
            disabled={!detailedDoc.trim() || loading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded transition"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> {isFrench ? 'Optimisation...' : 'Optimizing...'}</>
            ) : (
              <><Sparkles size={16} /> {isFrench ? 'Appliquer au CV' : 'Apply to Resume'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
