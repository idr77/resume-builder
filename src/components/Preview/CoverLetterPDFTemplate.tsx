import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ResumeData } from '../../types/resume';

// Disable hyphenation to prevent unwanted word breaks in PDF rendering
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 55,
    paddingTop: 55,
    paddingBottom: 55,
  },
  
  // Classical Letter Layout
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  senderBlock: {
    flexDirection: 'column',
    gap: 3,
    maxWidth: 220,
  },
  senderName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a202c',
  },
  senderTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#4a5568',
    marginBottom: 2,
  },
  senderText: {
    fontSize: 9,
    color: '#4a5568',
  },
  
  recipientBlock: {
    flexDirection: 'column',
    gap: 3,
    marginTop: 20,
    alignItems: 'flex-end',
    textAlign: 'right',
    maxWidth: 220,
  },
  recipientTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a202c',
  },
  recipientText: {
    fontSize: 9,
    color: '#4a5568',
  },

  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 25,
  },
  dateText: {
    fontSize: 9.5,
    color: '#4a5568',
  },

  subjectContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4,
    marginBottom: 25,
  },
  subjectLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1a202c',
  },
  
  // Letter Body
  bodyContainer: {
    flexDirection: 'column',
    gap: 14,
  },
  bodyParagraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1a202c',
    textAlign: 'justify',
  },
  
  // Signature
  signatureContainer: {
    marginTop: 35,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  signatureGreeting: {
    fontSize: 10,
    color: '#4a5568',
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#1a202c',
  }
});

interface Props {
  data: ResumeData;
}

export default function CoverLetterPDFTemplate({ data }: Props) {
  const isFrench = data.language === 'fr';
  const currentDate = new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subjectText = isFrench 
    ? `Objet : Candidature au poste de ${data.personalInfo.jobTitle || 'Ingénieur'}`
    : `Subject: Application for the position of ${data.personalInfo.jobTitle || 'Engineer'}`;

  // Parse paragraphs from cover letter text
  const paragraphs = data.coverLetter
    ? data.coverLetter.split('\n').map(p => p.trim()).filter(Boolean)
    : [
        isFrench 
          ? "Veuillez générer votre lettre de motivation en utilisant le bouton 'Générer avec IA' dans la section correspondante du formulaire."
          : "Please generate your cover letter using the 'Generate with AI' button in the cover letter form section."
      ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Classical Sender & Recipient Header */}
        <View style={styles.metaContainer}>
          {/* Sender details on top left */}
          <View style={styles.senderBlock}>
            <Text style={styles.senderName}>{data.personalInfo.fullName}</Text>
            {data.personalInfo.jobTitle && (
              <Text style={styles.senderTitle}>{data.personalInfo.jobTitle}</Text>
            )}
            {data.personalInfo.location && (
              <Text style={styles.senderText}>{data.personalInfo.location}</Text>
            )}
            {data.personalInfo.phone && (
              <Text style={styles.senderText}>{data.personalInfo.phone}</Text>
            )}
            {data.personalInfo.email && (
              <Text style={styles.senderText}>{data.personalInfo.email}</Text>
            )}
            {data.personalInfo.linkedin && (
              <Text style={styles.senderText}>LinkedIn: {data.personalInfo.linkedin}</Text>
            )}
            {data.personalInfo.portfolio && (
              <Text style={styles.senderText}>Web: {data.personalInfo.portfolio}</Text>
            )}
          </View>
          
          {/* Recipient on top right */}
          <View style={styles.recipientBlock}>
            <Text style={styles.recipientTitle}>
              {isFrench ? "À l'attention de l'équipe de recrutement" : "To the Hiring Team"}
            </Text>
            <Text style={styles.recipientText}>
              {isFrench ? "Département des Ressources Humaines" : "Human Resources Department"}
            </Text>
          </View>
        </View>

        {/* Date block on the right */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {isFrench ? `Le ${currentDate}` : `Date: ${currentDate}`}
          </Text>
        </View>

        {/* Subject */}
        <View style={styles.subjectContainer}>
          <Text style={styles.subjectLabel}>{subjectText}</Text>
        </View>

        {/* Body Paragraphs */}
        <View style={styles.bodyContainer}>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={styles.bodyParagraph}>{p}</Text>
          ))}
        </View>

        {/* Signature at bottom right */}
        <View style={styles.signatureContainer}>
          <Text style={styles.signatureGreeting}>
            {isFrench ? "Cordialement," : "Sincerely,"}
          </Text>
          <Text style={styles.signatureName}>{data.personalInfo.fullName}</Text>
        </View>
      </Page>
    </Document>
  );
}
