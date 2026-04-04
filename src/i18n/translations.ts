import type { Language } from '../types/resume';

export const translations = {
  en: {
    app: {
      title: 'ATS Resume Builder',
      subtitle: 'Fill in your details below. Preview updates automatically.',
      quickImport: '✨ Quick Import Text (MVP)',
      livePreview: 'Live Preview',
      downloadPdf: 'Download PDF',
      generatingPdf: 'Generating PDF...',
    },
    form: {
      personalInfo: 'Personal Information',
      fullName: 'Full Name',
      jobTitle: 'Job Title',
      email: 'Email',
      phone: 'Phone',
      location: 'Location',
      linkedin: 'LinkedIn URL',
      portfolio: 'Portfolio/Website',
      photoUpload: 'Photo (Upload or URL)',
      photoPlaceholder: 'Or paste image URL',
      summary: 'Professional Summary',
      summaryPlaceholder: 'A brief overview of your professional background and goals.',
      experience: 'Experience',
      company: 'Company',
      role: 'Role',
      startDate: 'Start Date',
      endDate: 'End Date',
      currentJob: 'Currently works here',
      descriptionBullet: 'Description (Bullet points)',
      addExperience: 'Add Experience',
      education: 'Education',
      school: 'School',
      degree: 'Degree',
      addEducation: 'Add Education',
      skillsInterests: 'Skills & Interests',
      skills: 'Skills (Comma separated)',
      skillsPlaceholder: 'React, TypeScript, Project Management...',
      languages: 'Languages',
      addLanguage: 'Add Language',
      level: 'Level (1-3)',
      interests: 'Interests (Comma separated)',
      interestsPlaceholder: 'Photography, Hiking, Open Source...'
    },
    modal: {
      title: 'Quick Import (Raw Text)',
      description: 'Paste your raw resume text below. This feature will use a simple heuristic to fill out the form for the MVP. Advanced LLM parsing is planned for future updates.',
      placeholder: 'Jane Doe\nSoftware Engineer\njane@example.com\n...',
      cancel: 'Cancel',
      importData: 'Import Data'
    }
  },
  fr: {
    app: {
      title: 'Créateur de CV ATS',
      subtitle: 'Remplissez vos informations ci-dessous. L\'aperçu se met à jour automatiquement.',
      quickImport: '✨ Import Rapide (MVP)',
      livePreview: 'Aperçu en direct',
      downloadPdf: 'Télécharger le PDF',
      generatingPdf: 'Génération en cours...',
    },
    form: {
      personalInfo: 'Contact',
      fullName: 'Nom Complet',
      jobTitle: 'Titre du poste',
      email: 'Email',
      phone: 'Téléphone',
      location: 'Adresse',
      linkedin: 'URL LinkedIn',
      portfolio: 'Portfolio / Site Web',
      photoUpload: 'Photo (Téléchargement ou URL)',
      photoPlaceholder: 'Ou collez l\'URL de l\'image',
      summary: 'Profil',
      summaryPlaceholder: 'Un bref aperçu de votre parcours et de vos objectifs.',
      experience: 'Expérience',
      company: 'Entreprise',
      role: 'Rôle',
      startDate: 'Date de début',
      endDate: 'Date de fin',
      currentJob: 'J\'y travaille actuellement',
      descriptionBullet: 'Description (Points-clés)',
      addExperience: 'Ajouter une expérience',
      education: 'Formation',
      school: 'École',
      degree: 'Diplôme',
      addEducation: 'Ajouter une formation',
      skillsInterests: 'Compétences & Centres d\'intérêt',
      skills: 'Compétences (Séparées par des virgules)',
      skillsPlaceholder: 'Java, Python, Gestion de projet...',
      languages: 'Langues',
      addLanguage: 'Ajouter une langue',
      level: 'Niveau (1-3)',
      interests: 'Centres d\'intérêt (Séparés par des virgules)',
      interestsPlaceholder: 'Nouvelles technologies, Escalade, Natation...'
    },
    modal: {
      title: 'Import Rapide (Texte brut)',
      description: 'Collez le texte brut de votre CV ci-dessous. Cette fonction utilisera une heuristique simple pour remplir le formulaire.',
      placeholder: 'Jean Dupont\nIngénieur Logiciel\njean@exemple.com\n...',
      cancel: 'Annuler',
      importData: 'Importer les données'
    }
  }
};

export const getTranslation = (lang: Language) => translations[lang];
