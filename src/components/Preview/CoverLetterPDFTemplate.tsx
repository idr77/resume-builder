import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ResumeData } from '../../types/resume';

// Disable hyphenation to prevent unwanted word breaks in PDF rendering
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 50,
    paddingTop: 50,
    paddingBottom: 50,
  },
  
  // Header Cohesive with Resume
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#2b3643',
    paddingBottom: 15,
    marginBottom: 25,
  },
  name: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: '#2b3643',
    letterSpacing: 1,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 2,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 8,
    color: '#666666',
  },
  contactItem: {
    fontFamily: 'Helvetica',
  },
  
  // Letter Meta Data
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  senderMeta: {
    flexDirection: 'column',
    gap: 2,
  },
  recipientMeta: {
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  metaLabelBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#333333',
  },
  metaText: {
    fontSize: 9,
    color: '#555555',
  },
  
  // Date and Subject
  dateText: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 15,
  },
  subjectContainer: {
    marginBottom: 20,
  },
  subjectLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#2b3643',
  },
  
  // Letter Body
  bodyContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  bodyParagraph: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: '#333333',
    textAlign: 'justify',
  },
  
  // Signature
  signatureContainer: {
    marginTop: 30,
    flexDirection: 'column',
    gap: 2,
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#2b3643',
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
        {/* Cohesive Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.name}>{data.personalInfo.fullName}</Text>
          {data.personalInfo.jobTitle && (
            <Text style={styles.jobTitle}>{data.personalInfo.jobTitle.toUpperCase()}</Text>
          )}
          
          <View style={styles.contactRow}>
            {data.personalInfo.phone && (
              <Text style={styles.contactItem}>{data.personalInfo.phone}</Text>
            )}
            {data.personalInfo.email && (
              <Text style={styles.contactItem}>{data.personalInfo.email}</Text>
            )}
            {data.personalInfo.location && (
              <Text style={styles.contactItem}>{data.personalInfo.location}</Text>
            )}
            {data.personalInfo.linkedin && (
              <Text style={styles.contactItem}>LinkedIn: {data.personalInfo.linkedin}</Text>
            )}
            {data.personalInfo.portfolio && (
              <Text style={styles.contactItem}>Web: {data.personalInfo.portfolio}</Text>
            )}
          </View>
        </View>

        {/* Sender & Recipient Meta block */}
        <View style={styles.metaContainer}>
          <View style={styles.senderMeta}>
            <Text style={styles.metaLabelBold}>{data.personalInfo.fullName}</Text>
            <Text style={styles.metaText}>{data.personalInfo.location}</Text>
          </View>
          
          <View style={styles.recipientMeta}>
            <Text style={styles.metaLabelBold}>
              {isFrench ? "Responsable du recrutement" : "Hiring Manager"}
            </Text>
            <Text style={styles.metaText}>
              {isFrench ? "Département des Ressources Humaines" : "Human Resources Department"}
            </Text>
          </View>
        </View>

        {/* Date */}
        <Text style={styles.dateText}>
          {isFrench ? `Fait le ${currentDate}` : `Date: ${currentDate}`}
        </Text>

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

        {/* Signature */}
        <View style={styles.signatureContainer}>
          <Text style={styles.metaText}>
            {isFrench ? "Cordialement," : "Sincerely,"}
          </Text>
          <Text style={styles.signatureName}>{data.personalInfo.fullName}</Text>
        </View>
      </Page>
    </Document>
  );
}
