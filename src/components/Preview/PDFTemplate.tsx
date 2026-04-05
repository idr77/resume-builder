import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Font, Link } from '@react-pdf/renderer';
import type { ResumeData } from '../../types/resume';

// Disable hyphenation to prevent unwanted word breaks in PDF rendering
Font.registerHyphenationCallback((word) => [word]);

// Define the exact styling referencing the user's uploaded model
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row-reverse', // ATS Fix: renders right-to-left allowing Main to be placed right but read first!
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    paddingTop: 35,
    paddingBottom: 35,
  },
  pageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: '#2b3643',
  },
  
  // Left Sidebar
  sidebar: {
    width: '35%',
    color: '#ffffff',
    paddingHorizontal: 25,
    display: 'flex',
    flexDirection: 'column',
    gap: 20, // Automatically handles spacing between sections without creating trailing margins
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 10, // Was 30, reduced to 10 because gap gives another 20
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
    // marginBottom: 20, // Removed to avoid trailing margins, gap handles this dynamically
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
    paddingHorizontal: 30,
    color: '#333333',
    display: 'flex',
    flexDirection: 'column',
    gap: 20, // Automatically handles spacing between sections without creating trailing margins
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
    // marginBottom: 10, managed inline dynamically
  },
  summary: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
    // marginBottom: 25, managed inline dynamically to interact perfectly with gap
    textAlign: 'left'
  },
  
  mainSection: {
    // marginBottom: 20, // Removed to avoid trailing margins, gap handles this dynamically
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
    fontSize: 8,
    color: '#666666',
    textAlign: 'center'
  },
  expBulletText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 1.4,
    color: '#555555',
    textAlign: 'left',
  }
});

interface Props {
  data: ResumeData;
  template?: 'classic' | 'modern' | 'executive';
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <Svg viewBox="0 0 24 24" style={{ width: 8, height: 8, marginRight: 2 }}>
    <Path
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      fill={filled ? "#FBBF24" : "none"}
      stroke="#FBBF24"
      strokeWidth={1.5}
    />
  </Svg>
);

const safelyBreakUrl = (url: string) => {
  if (!url) return '';
  if (url.length <= 24) return url;
  
  const mid = Math.floor(url.length / 2);
  let breakIdx = url.indexOf('/', mid);
  if (breakIdx === -1) breakIdx = url.indexOf('.', mid);
  
  if (breakIdx !== -1) {
    const splitAt = url[breakIdx] === '/' ? breakIdx + 1 : breakIdx;
    return url.slice(0, splitAt) + '\n' + url.slice(splitAt);
  }
  
  return url.slice(0, mid + 5) + '\n' + url.slice(mid + 5);
};

const formatUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

const renderStyledText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={{ fontFamily: 'Helvetica-Bold' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
       return <Text key={index} style={{ textDecoration: 'underline' }}>{part.slice(2, -2)}</Text>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <Text key={index} style={{ fontFamily: 'Helvetica-Oblique' }}>{part.slice(1, -1)}</Text>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

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
        <View style={styles.pageBackground} fixed />
        
        {/* === MAIN CONTENT (RIGHT SIDE VISUALLY, BUT RENDERED FIRST FOR ATS) === */}
        <View style={styles.main}>
          
          {/* Header */}
          <View>
            <Text style={styles.name}>{data.personalInfo.fullName}</Text>
            <Text style={[styles.jobTitleRow, { marginBottom: data.summary ? 10 : 0 }]}>{data.personalInfo.jobTitle}</Text>
            {data.summary && (
              <Text style={[styles.summary, { marginBottom: 5 }]}>{data.summary}</Text>
            )}
          </View>

          {/* Experience */}
          {data.experience.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainTitle}>{strings.experience}</Text>
              {data.experience.map((exp, index) => (
                <View key={exp.id} style={[styles.expItem, index === data.experience.length - 1 ? { marginBottom: 0 } : {}]}>
                  <Text style={styles.expYear}>
                    {exp.startDate} {exp.endDate && exp.endDate !== exp.startDate ? `- ${exp.endDate}` : ''}
                  </Text>
                  <Text style={styles.expCompanyRow}>
                    {exp.company}{exp.location ? ` - ${exp.location}` : ''}
                  </Text>
                  <Text style={styles.expRole}>{exp.role}</Text>
                  
                  {/* Parse bullets from description */}
                  {exp.description.split('\n').filter(line => line.trim().length > 0).map((bullet, i, arr) => {
                    const match = bullet.match(/^(\s*)([-*])\s+(.*)$/);
                    let level = 0;
                    let text = bullet.trim();
                    let dot = '';
                    
                    if (match) {
                      const spaces = match[1].length;
                      level = Math.floor(spaces / 2); // 2 spaces per indentation level
                      text = match[3];
                      dot = level > 0 ? '-' : '•';
                    } else if (text.match(/^[-*]\s+/)) {
                       // Fallback if the regex somehow missed it but it starts with a bullet
                       text = text.replace(/^[-*]\s+/, '');
                       dot = '•';
                    }

                    return (
                      <View key={i} style={[styles.expBulletRow, { paddingLeft: level * 10, marginTop: dot === '' ? 2 : 0, marginBottom: i === arr.length - 1 ? 0 : 2 }]}>
                        {dot && <Text style={styles.expBulletDot}>{dot}</Text>}
                        <Text style={styles.expBulletText}>
                          {renderStyledText(text)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Interests */}
          {data.interests.filter(i => i.name.trim()).length > 0 && (
            <View style={styles.mainSection} wrap={false}>
              <Text style={styles.mainTitle}>{strings.interests}</Text>
              <View style={styles.tagsContainer}>
                {data.interests.filter(i => i.name.trim()).map(interest => (
                  <Text key={interest.id} style={styles.tag}>{interest.name}</Text>
                ))}
              </View>
            </View>
          )}

        </View>

        {/* === SIDEBAR (LEFT VISUALLY, BUT RENDERED SECOND FOR ATS) === */}
        <View style={styles.sidebar}>
          
          {/* Photo */}
          {data.personalInfo.photoUrl && (
            <View style={styles.photoContainer}>
              <Image src={data.personalInfo.photoUrl} style={styles.photo} />
            </View>
          )}

          {/* Contact */}
          <View style={styles.sidebarSection} wrap={false}>
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
                <Text style={styles.sidebarText}>
                  <Link src={formatUrl(data.personalInfo.linkedin)} style={{ textDecoration: 'none', color: '#ffffff' }}>
                    {safelyBreakUrl(data.personalInfo.linkedin)}
                  </Link>
                </Text>
              </View>
            )}

            {data.personalInfo.portfolio && (
              <View style={[styles.sidebarTextContent, { marginBottom: 0 }]}>
                <Text style={styles.sidebarLabel}>Portfolio</Text>
                <Text style={styles.sidebarText}>
                  <Link src={formatUrl(data.personalInfo.portfolio)} style={{ textDecoration: 'none', color: '#ffffff' }}>
                    {safelyBreakUrl(data.personalInfo.portfolio)}
                  </Link>
                </Text>
              </View>
            )}
          </View>

          {/* Skills */}
          {data.skills.filter(s => s.name.trim()).length > 0 && (
            <View style={styles.sidebarSection} wrap={false}>
              <Text style={styles.sidebarTitle}>{strings.skills}</Text>
              <View style={styles.tagsContainer}>
                {data.skills.filter(s => s.name.trim()).map(skill => (
                  <Text key={skill.id} style={styles.tag}>{skill.name}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Languages */}
          {data.resumeLanguages.filter(l => l.name.trim()).length > 0 && (
            <View style={styles.sidebarSection} wrap={false}>
              <Text style={styles.sidebarTitle}>{strings.languages}</Text>
              {data.resumeLanguages.filter(l => l.name.trim()).map((lang, index, arr) => {
                const level = Math.max(1, Math.min(3, lang.level));
                return (
                  <View key={lang.id} style={{ marginBottom: index === arr.length - 1 ? 0 : 6 }}>
                    <Text style={styles.sidebarLabel}>{lang.name}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 3 }}>
                      <StarIcon filled={level >= 1} />
                      <StarIcon filled={level >= 2} />
                      <StarIcon filled={level >= 3} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Formation (Education on the Left) */}
          {data.education.length > 0 && (
            <View style={styles.sidebarSection} wrap={false}>
              <Text style={styles.sidebarTitle}>{strings.education}</Text>
              {data.education.map((edu, index) => (
                <View key={edu.id} style={[styles.sidebarTextContent, index === data.education.length - 1 ? { marginBottom: 0 } : {}]}>
                  <Text style={styles.sidebarText}>{edu.startDate} {edu.endDate && `- ${edu.endDate}`}</Text>
                  <Text style={styles.sidebarLabel}>{edu.degree}</Text>
                  <Text style={styles.sidebarText}>{edu.school}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
