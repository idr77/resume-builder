import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { ResumeData } from '../../types/resume';

// Define the exact styling referencing the user's uploaded model
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },
  
  // Left Sidebar
  sidebar: {
    width: '35%',
    backgroundColor: '#2b3643', // Dark slate derived from the model
    color: '#ffffff',
    padding: 25,
    paddingTop: 35,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#4A5568',
    objectFit: 'cover',
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'none', // The model uses Title Case "Contact", "Formation", "Compétences"
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
    paddingBottom: 4,
    marginBottom: 12,
  },
  sidebarTextContent: {
    marginBottom: 12,
  },
  sidebarLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  sidebarText: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.3,
  },
  sidebarBullet: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
  },
  sidebarBulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#3e4d5f',
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 9,
    borderRadius: 3,
    color: '#ffffff',
  },

  // Main Content
  main: {
    width: '65%',
    padding: 30,
    paddingTop: 35,
    paddingRight: 35,
    color: '#333333',
  },
  name: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#2b3643', 
    letterSpacing: 1,
    marginBottom: 6,
  },
  jobTitleRow: {
    fontSize: 13,
    color: '#555555',
    letterSpacing: 2,
    marginBottom: 10,
  },
  summary: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
    marginBottom: 25,
    textAlign: 'justify'
  },
  
  mainSection: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2b3643',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2b3643',
    paddingBottom: 4,
    marginBottom: 15,
  },
  
  expItem: {
    marginBottom: 14,
  },
  expYear: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    marginBottom: 2,
  },
  expCompanyRow: {
    fontSize: 10,
    color: '#777777',
    marginBottom: 3,
  },
  expRole: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2b3643',
    marginBottom: 4,
  },
  expBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  expBulletDot: {
    width: 12,
    fontSize: 9,
    color: '#666666',
    textAlign: 'center'
  },
  expBulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: '#555555',
  }
});

interface Props {
  data: ResumeData;
  template?: 'classic' | 'modern' | 'executive';
}

export default function PDFTemplate({ data, template = 'classic' }: Props) {
  const strings = {
    contact: data.language === 'fr' ? 'Contact' : 'Contact',
    phoneLabel: data.language === 'fr' ? 'Téléphone' : 'Phone',
    emailLabel: data.language === 'fr' ? 'Email' : 'Email',
    addressLabel: data.language === 'fr' ? 'Adresse' : 'Address',
    education: data.language === 'fr' ? 'Formation' : 'Education',
    skills: data.language === 'fr' ? 'Compétences' : 'Skills',
    experience: data.language === 'fr' ? 'Experience' : 'Experience', // Model uses "Experience" instead of Expériences 
    interests: data.language === 'fr' ? "Centres d'intérêt" : 'Interests',
    languages: data.language === 'fr' ? 'Langues' : 'Languages', // For bottom left if needed
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* === LEFT SIDEBAR === */}
        <View style={styles.sidebar}>
          
          {/* Photo */}
          {data.personalInfo.photoUrl && (
            <View style={styles.photoContainer}>
              <Image src={data.personalInfo.photoUrl} style={styles.photo} />
            </View>
          )}

          {/* Contact */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarTitle}>{strings.contact}</Text>
            
            {data.personalInfo.phone && (
              <View style={styles.sidebarTextContent}>
                <Text style={styles.sidebarLabel}>{strings.phoneLabel}</Text>
                <Text style={styles.sidebarText}>{data.personalInfo.phone}</Text>
              </View>
            )}
            
            {data.personalInfo.email && (
              <View style={styles.sidebarTextContent}>
                <Text style={styles.sidebarLabel}>{strings.emailLabel}</Text>
                <Text style={styles.sidebarText}>{data.personalInfo.email}</Text>
              </View>
            )}

            {data.personalInfo.location && (
              <View style={styles.sidebarTextContent}>
                <Text style={styles.sidebarLabel}>{strings.addressLabel}</Text>
                <Text style={styles.sidebarText}>{data.personalInfo.location}</Text>
              </View>
            )}

            {data.personalInfo.linkedin && (
              <View style={styles.sidebarTextContent}>
                <Text style={styles.sidebarLabel}>LinkedIn</Text>
                <Text style={styles.sidebarText}>{data.personalInfo.linkedin}</Text>
              </View>
            )}
          </View>

          {/* Formation (Education on the Left) */}
          {data.education.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>{strings.education}</Text>
              {data.education.map(edu => (
                <View key={edu.id} style={styles.sidebarTextContent}>
                  <Text style={styles.sidebarText}>{edu.startDate} {edu.endDate && `- ${edu.endDate}`}</Text>
                  <Text style={styles.sidebarLabel}>{edu.degree}</Text>
                  <Text style={styles.sidebarText}>{edu.school}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>{strings.skills}</Text>
              <View style={styles.tagsContainer}>
                {data.skills.map(skill => (
                  <Text key={skill.id} style={styles.tag}>{skill.name}</Text>
                ))}
              </View>
            </View>
          )}
        </View>


        {/* === MAIN CONTENT (RIGHT SIDE) === */}
        <View style={styles.main}>
          
          {/* Header */}
          <Text style={styles.name}>{data.personalInfo.fullName}</Text>
          <Text style={styles.jobTitleRow}>{data.personalInfo.jobTitle}</Text>
          
          {data.summary && (
            <Text style={styles.summary}>{data.summary}</Text>
          ) || <View style={{marginBottom: 20}} /> /* Spacer if no summary */}

          {/* Experience */}
          {data.experience.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainTitle}>{strings.experience}</Text>
              {data.experience.map(exp => (
                <View key={exp.id} style={styles.expItem}>
                  <Text style={styles.expYear}>
                    {exp.startDate} {exp.endDate && exp.endDate !== exp.startDate ? `- ${exp.endDate}` : ''}
                  </Text>
                  <Text style={styles.expCompanyRow}>{exp.company}</Text>
                  <Text style={styles.expRole}>{exp.role}</Text>
                  
                  {/* Parse bullets from description */}
                  {exp.description.split('\n').filter(Boolean).map((bullet, i) => (
                    <View key={i} style={styles.expBulletRow}>
                      <Text style={styles.expBulletDot}>•</Text>
                      <Text style={styles.expBulletText}>
                        {bullet.trim().replace(/^•\s*/, '')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Interests */}
          {data.interests.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainTitle}>{strings.interests}</Text>
              <View style={styles.tagsContainer}>
                {data.interests.map(interest => (
                  <Text key={interest.id} style={styles.tag}>{interest.name}</Text>
                ))}
              </View>
            </View>
          )}

        </View>
      </Page>
    </Document>
  );
}
