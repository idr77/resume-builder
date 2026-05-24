import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Font, Link } from '@react-pdf/renderer';
import type { ResumeData } from '../../types/resume';

// Disable hyphenation to prevent unwanted word breaks in PDF rendering
Font.registerHyphenationCallback((word) => [word]);

const colorPalette = {
  slate: { primary: '#2b3643', accent: '#3e4d5f', textLight: '#ffffff', textDark: '#333333', border: '#e2e8f0', tagBg: '#f1f5f9', tagText: '#334155' },
  navy: { primary: '#1e3a8a', accent: '#3b82f6', textLight: '#ffffff', textDark: '#1e293b', border: '#dbeafe', tagBg: '#eff6ff', tagText: '#1e40af' },
  emerald: { primary: '#064e3b', accent: '#10b981', textLight: '#ffffff', textDark: '#0f172a', border: '#d1fae5', tagBg: '#ecfdf5', tagText: '#065f46' },
  indigo: { primary: '#312e81', accent: '#6366f1', textLight: '#ffffff', textDark: '#111827', border: '#e0e7ff', tagBg: '#eef2ff', tagText: '#3730a3' },
  burgundy: { primary: '#4c0519', accent: '#be123c', textLight: '#ffffff', textDark: '#1c1917', border: '#ffe4e6', tagBg: '#fff1f2', tagText: '#9f1239' }
};

const fontSizes = {
  small: { base: 8.5, title: 15, name: 26, spacing: 14, bulletSp: 2 },
  medium: { base: 9.8, title: 18, name: 32, spacing: 20, bulletSp: 3 },
  large: { base: 11, title: 20, name: 36, spacing: 24, bulletSp: 4 }
};

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

const renderStyledText = (text: string, font: string) => {
  const parts = text.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_)/g);
  const boldFont = `${font}-Bold`;
  const obliqueFont = `${font}-Oblique`;
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={{ fontFamily: boldFont }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
       return <Text key={index} style={{ textDecoration: 'underline' }}>{part.slice(2, -2)}</Text>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <Text key={index} style={{ fontFamily: obliqueFont }}>{part.slice(1, -1)}</Text>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

interface Props {
  data: ResumeData;
  template?: 'classic' | 'modern' | 'executive';
}

export default function PDFTemplate({ data }: Props) {
  const isFrench = data.language === 'fr';

  const strings = {
    contact: isFrench ? 'Contact' : 'Contact',
    phoneLabel: isFrench ? 'Téléphone' : 'Phone',
    emailLabel: isFrench ? 'Email' : 'Email',
    addressLabel: isFrench ? 'Adresse' : 'Address',
    education: isFrench ? 'Formation' : 'Education',
    skills: isFrench ? 'Compétences' : 'Skills',
    experience: isFrench ? 'Experience' : 'Experience',
    interests: isFrench ? "Centres d'intérêt" : 'Interests',
    languages: isFrench ? 'Langues' : 'Languages',
  };

  // Get current styles from ResumeData
  const settings = data.styleSettings || {
    template: 'classic',
    themeColor: 'slate',
    fontFamily: 'Helvetica',
    fontSize: 'medium'
  };

  const palette = colorPalette[settings.themeColor] || colorPalette.slate;
  const size = fontSizes[settings.fontSize] || fontSizes.medium;
  const font = settings.fontFamily;
  const fontBold = `${font}-Bold`;

  // Dynamic Stylesheet construction
  const styles = StyleSheet.create({
    page: {
      flexDirection: settings.template === 'classic' ? 'row-reverse' : 'column',
      fontFamily: font,
      fontSize: size.base,
      backgroundColor: '#ffffff',
      paddingTop: settings.template === 'executive' ? 40 : 35,
      paddingBottom: settings.template === 'executive' ? 40 : 35,
    },
    
    // Classic Template Background
    pageBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: '35%',
      backgroundColor: palette.primary,
    },
    
    // Classic Layout Sidebar
    sidebar: {
      width: '35%',
      color: '#ffffff',
      paddingHorizontal: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: size.spacing - 2,
    },
    photoContainer: {
      alignItems: 'center',
      marginBottom: 5,
    },
    photo: {
      width: 105,
      height: 105,
      borderRadius: 52.5,
      borderWidth: 1,
      borderColor: '#4A5568',
      objectFit: 'cover',
    },
    sidebarSection: {
      display: 'flex',
      flexDirection: 'column',
    },
    sidebarTitle: {
      fontSize: size.base + 3,
      fontFamily: fontBold,
      borderBottomWidth: 1.5,
      borderBottomColor: '#ffffff',
      paddingBottom: 4,
      marginBottom: 10,
    },
    sidebarTextContent: {
      marginBottom: 8,
    },
    sidebarLabel: {
      fontFamily: fontBold,
      fontSize: size.base,
      marginBottom: 2,
    },
    sidebarText: {
      fontSize: size.base - 0.8,
      lineHeight: 1.3,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },
    tagClassic: {
      backgroundColor: palette.accent,
      paddingHorizontal: 6,
      paddingVertical: 3,
      fontSize: size.base - 1,
      borderRadius: 3,
      color: '#ffffff',
    },
    tagModern: {
      backgroundColor: palette.tagBg,
      color: palette.tagText,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      fontSize: size.base - 0.8,
      borderRadius: 4,
      fontFamily: fontBold,
    },

    // Classic & Modern main content container
    main: {
      width: settings.template === 'classic' ? '65%' : '100%',
      paddingHorizontal: settings.template === 'classic' ? 25 : 35,
      color: palette.textDark,
      display: 'flex',
      flexDirection: 'column',
      gap: size.spacing,
    },
    
    // Header for Classic & Modern
    nameClassic: {
      fontSize: size.name,
      fontFamily: fontBold,
      color: palette.primary, 
      letterSpacing: 1,
      marginBottom: 4,
    },
    jobTitleClassic: {
      fontSize: size.base + 3,
      color: '#555555',
      letterSpacing: 2,
      fontFamily: fontBold,
    },
    summary: {
      fontSize: size.base - 0.5,
      color: '#555555',
      lineHeight: 1.4,
      textAlign: 'justify',
    },

    mainSection: {
      display: 'flex',
      flexDirection: 'column',
    },
    mainTitle: {
      fontSize: size.title,
      fontFamily: fontBold,
      color: palette.primary,
      borderBottomWidth: 1.5,
      borderBottomColor: palette.primary,
      paddingBottom: 4,
      marginBottom: 12,
    },
    
    expItem: {
      marginBottom: 16,
    },
    expYear: {
      fontSize: size.base,
      fontFamily: fontBold,
      color: '#555555',
      marginBottom: 2,
    },
    expCompanyRow: {
      fontSize: size.base,
      color: '#666666',
      marginBottom: 3,
      fontFamily: font,
    },
    expRole: {
      fontSize: size.base + 1,
      fontFamily: fontBold,
      color: palette.primary,
      marginBottom: 4,
    },
    expBulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: size.bulletSp,
    },
    expBulletDot: {
      width: 10,
      fontSize: 8,
      color: '#666666',
      textAlign: 'center',
    },
    expBulletText: {
      flex: 1,
      fontSize: size.base - 0.8,
      lineHeight: 1.35,
      color: '#444444',
      textAlign: 'left',
    },

    // Modern Header Styles
    modernHeader: {
      paddingHorizontal: 35,
      marginBottom: 15,
      borderBottomWidth: 2,
      borderBottomColor: palette.primary,
      paddingBottom: 12,
    },
    modernContactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
      fontSize: size.base - 1,
      color: '#555555',
    },
    
    // Executive Template Styles
    execHeader: {
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1.5,
      borderBottomColor: palette.primary,
      paddingBottom: 15,
      marginHorizontal: 40,
    },
    execContactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 8,
      fontSize: size.base - 1,
      color: '#555555',
      width: '100%',
    },
    execSection: {
      marginHorizontal: 40,
      marginBottom: 15,
    },
    execExpCompanyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 2,
    },
    execExpRoleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 4,
    }
  });

  const renderBullets = (description: string) => {
    return description.split('\n').filter(line => line.trim().length > 0).map((bullet, i) => {
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
         text = text.replace(/^[-*]\s+/, '');
         dot = '•';
      }

      return (
        <View key={i} style={[styles.expBulletRow, { paddingLeft: level * 8, marginTop: dot === '' ? (i > 0 ? 10 : 2) : 0 }]}>
          {dot && <Text style={styles.expBulletDot}>{dot}</Text>}
          <Text style={styles.expBulletText}>
            {renderStyledText(text, font)}
          </Text>
        </View>
      );
    });
  };

  const renderClassicTemplate = () => (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageBackground} fixed />
      
      {/* === MAIN CONTENT (RIGHT SIDE VISUALLY, BUT RENDERED FIRST FOR ATS) === */}
      <View style={styles.main}>
        
        {/* Header */}
        <View>
          <Text style={styles.nameClassic}>{data.personalInfo.fullName}</Text>
          <Text style={[styles.jobTitleClassic, { marginBottom: data.summary ? 8 : 0 }]}>{data.personalInfo.jobTitle}</Text>
          {data.summary && (
            <Text style={styles.summary}>{data.summary}</Text>
          )}
        </View>

        {/* Experience */}
        {data.experience.length > 0 && (
          <View style={styles.mainSection}>
            <Text style={styles.mainTitle}>{strings.experience}</Text>
            {data.experience.map((exp, index) => (
              <View key={exp.id} wrap={index === 0 ? false : true} style={[styles.expItem, index === data.experience.length - 1 ? { marginBottom: 0 } : {}]}>
                <Text style={styles.expYear}>
                  {exp.startDate} {exp.endDate && exp.endDate !== exp.startDate ? `- ${exp.endDate}` : ''}
                </Text>
                <Text style={styles.expCompanyRow}>
                  {exp.company}{exp.location ? ` - ${exp.location}` : ''}
                </Text>
                <Text style={styles.expRole}>{exp.role}</Text>
                {renderBullets(exp.description)}
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
                <Text key={interest.id} style={styles.tagClassic}>{interest.name}</Text>
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
                <Text key={skill.id} style={styles.tagClassic}>{skill.name}</Text>
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
                <View key={lang.id} style={{ marginBottom: index === arr.length - 1 ? 0 : 5 }}>
                  <Text style={styles.sidebarLabel}>{lang.name}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                    <StarIcon filled={level >= 1} />
                    <StarIcon filled={level >= 2} />
                    <StarIcon filled={level >= 3} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Formation */}
        {data.education.length > 0 && (
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarTitle}>{strings.education}</Text>
            {data.education.map((edu, index) => (
              <View key={edu.id} wrap={false} style={[styles.sidebarTextContent, index === data.education.length - 1 ? { marginBottom: 0 } : {}]}>
                <Text style={styles.sidebarText}>{edu.startDate} {edu.endDate && `- ${edu.endDate}`}</Text>
                <Text style={styles.sidebarLabel}>{edu.degree}</Text>
                <Text style={styles.sidebarText}>{edu.school}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );

  const renderModernTemplate = () => (
    <Page size="A4" style={styles.page}>
      {/* Top Header Section */}
      <View style={styles.modernHeader}>
        <Text style={styles.nameClassic}>{data.personalInfo.fullName}</Text>
        <Text style={styles.jobTitleClassic}>{data.personalInfo.jobTitle}</Text>
        
        <View style={styles.modernContactRow}>
          {data.personalInfo.phone && <Text>📞 {data.personalInfo.phone}</Text>}
          {data.personalInfo.email && <Text>✉️ {data.personalInfo.email}</Text>}
          {data.personalInfo.location && <Text>📍 {data.personalInfo.location}</Text>}
          {data.personalInfo.linkedin && (
            <Link src={formatUrl(data.personalInfo.linkedin)} style={{ textDecoration: 'none', color: '#555555' }}>
              🔗 LinkedIn
            </Link>
          )}
          {data.personalInfo.portfolio && (
            <Link src={formatUrl(data.personalInfo.portfolio)} style={{ textDecoration: 'none', color: '#555555' }}>
              🌐 Portfolio
            </Link>
          )}
        </View>
      </View>

      {/* Asymmetric 2-Column Body Layout */}
      <View style={{ flexDirection: 'row', flex: 1 }}>
        {/* Main Column (65%) */}
        <View style={{ width: '65%', paddingHorizontal: 30, display: 'flex', flexDirection: 'column', gap: size.spacing }}>
          {data.summary && (
            <View style={styles.mainSection}>
              <Text style={styles.mainTitle}>{isFrench ? 'Profil' : 'Profile'}</Text>
              <Text style={styles.summary}>{data.summary}</Text>
            </View>
          )}

          {data.experience.length > 0 && (
            <View style={styles.mainSection}>
              <Text style={styles.mainTitle}>{strings.experience}</Text>
              {data.experience.map((exp, index) => (
                <View key={exp.id} wrap={index === 0 ? false : true} style={styles.expItem}>
                  <Text style={styles.expRole}>{exp.role}</Text>
                  <Text style={styles.expCompanyRow}>
                    {exp.company} | {exp.startDate} - {exp.endDate}
                  </Text>
                  {renderBullets(exp.description)}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sidebar Column (35%) */}
        <View style={{ width: '35%', paddingHorizontal: 15, borderLeftWidth: 1.5, borderLeftColor: palette.border, display: 'flex', flexDirection: 'column', gap: size.spacing }}>
          {/* Skills */}
          {data.skills.filter(s => s.name.trim()).length > 0 && (
            <View style={styles.sidebarSection} wrap={false}>
              <Text style={styles.mainTitle}>{strings.skills}</Text>
              <View style={styles.tagsContainer}>
                {data.skills.filter(s => s.name.trim()).map(skill => (
                  <Text key={skill.id} style={styles.tagModern}>{skill.name}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.mainTitle}>{strings.education}</Text>
              {data.education.map((edu) => (
                <View key={edu.id} wrap={false} style={{ marginBottom: 12 }}>
                  <Text style={{ fontFamily: fontBold, fontSize: size.base }}>{edu.degree}</Text>
                  <Text style={{ fontSize: size.base - 0.5, color: '#555555' }}>{edu.school}</Text>
                  <Text style={{ fontSize: size.base - 1, color: '#777777', marginTop: 1 }}>{edu.startDate} - {edu.endDate}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Languages */}
          {data.resumeLanguages.filter(l => l.name.trim()).length > 0 && (
            <View style={styles.sidebarSection} wrap={false}>
              <Text style={styles.mainTitle}>{strings.languages}</Text>
              {data.resumeLanguages.filter(l => l.name.trim()).map((lang) => {
                const level = Math.max(1, Math.min(3, lang.level));
                return (
                  <View key={lang.id} style={{ marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: fontBold, fontSize: size.base - 0.5 }}>{lang.name}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <StarIcon filled={level >= 1} />
                      <StarIcon filled={level >= 2} />
                      <StarIcon filled={level >= 3} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Page>
  );

  const renderExecutiveTemplate = () => (
    <Page size="A4" style={styles.page}>
      {/* Centered Classic Executive Header */}
      <View style={styles.execHeader}>
        <Text style={{ fontSize: size.name - 4, fontFamily: fontBold, color: palette.primary, letterSpacing: 1.5 }}>
          {data.personalInfo.fullName.toUpperCase()}
        </Text>
        <Text style={{ fontSize: size.base + 1, fontFamily: fontBold, color: '#555555', letterSpacing: 3, marginTop: 4 }}>
          {data.personalInfo.jobTitle.toUpperCase()}
        </Text>
        
        <View style={styles.execContactRow}>
          {data.personalInfo.phone && <Text>{data.personalInfo.phone}</Text>}
          {data.personalInfo.phone && data.personalInfo.email && <Text>•</Text>}
          {data.personalInfo.email && <Text>{data.personalInfo.email}</Text>}
          {data.personalInfo.email && data.personalInfo.location && <Text>•</Text>}
          {data.personalInfo.location && <Text>{data.personalInfo.location}</Text>}
          {data.personalInfo.linkedin && <Text>•</Text>}
          {data.personalInfo.linkedin && (
            <Link src={formatUrl(data.personalInfo.linkedin)} style={{ textDecoration: 'none', color: '#555555' }}>
              LinkedIn
            </Link>
          )}
          {data.personalInfo.portfolio && <Text>•</Text>}
          {data.personalInfo.portfolio && (
            <Link src={formatUrl(data.personalInfo.portfolio)} style={{ textDecoration: 'none', color: '#555555' }}>
              Portfolio
            </Link>
          )}
        </View>
      </View>

      {/* Single-Column Body */}
      {/* Summary */}
      {data.summary && (
        <View style={styles.execSection}>
          <Text style={styles.mainTitle}>{isFrench ? 'PROFIL PROFESSIONNEL' : 'PROFESSIONAL SUMMARY'}</Text>
          <Text style={styles.summary}>{data.summary}</Text>
        </View>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <View style={styles.execSection}>
          <Text style={styles.mainTitle}>{isFrench ? 'PARCOURS PROFESSIONNEL' : 'PROFESSIONAL EXPERIENCE'}</Text>
          {data.experience.map((exp, index) => (
            <View key={exp.id} wrap={index === 0 ? false : true} style={{ marginBottom: 15 }}>
              <View style={styles.execExpCompanyHeader}>
                <Text style={{ fontSize: size.base + 0.5, fontFamily: fontBold, color: palette.primary }}>
                  {exp.company.toUpperCase()}
                </Text>
                <Text style={{ fontSize: size.base - 0.5, fontFamily: fontBold, color: '#555555' }}>
                  {exp.startDate} - {exp.endDate}
                </Text>
              </View>
              <View style={styles.execExpRoleRow}>
                <Text style={{ fontSize: size.base, fontFamily: fontBold, color: '#333333', fontStyle: 'italic' }}>
                  {exp.role}
                </Text>
                {exp.location && (
                  <Text style={{ fontSize: size.base - 1, color: '#666666' }}>{exp.location}</Text>
                )}
              </View>
              {renderBullets(exp.description)}
            </View>
          ))}
        </View>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <View style={styles.execSection}>
          <Text style={styles.mainTitle}>{isFrench ? 'FORMATION Académique' : 'EDUCATION'}</Text>
          {data.education.map((edu) => (
            <View key={edu.id} wrap={false} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <View>
                <Text style={{ fontFamily: fontBold, fontSize: size.base }}>{edu.degree} - {edu.school}</Text>
                {edu.description && <Text style={{ fontSize: size.base - 1, color: '#666666', marginTop: 1 }}>{edu.description}</Text>}
              </View>
              <Text style={{ fontSize: size.base - 0.8, fontFamily: fontBold, color: '#555555' }}>{edu.startDate} - {edu.endDate}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Skills */}
      {data.skills.filter(s => s.name.trim()).length > 0 && (
        <View style={styles.execSection} wrap={false}>
          <Text style={styles.mainTitle}>{isFrench ? 'COMPÉTENCES TECHNIQUES' : 'KEY SKILLS'}</Text>
          <View style={styles.tagsContainer}>
            {data.skills.filter(s => s.name.trim()).map(skill => (
              <Text key={skill.id} style={styles.tagModern}>{skill.name}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Languages & Interests */}
      <View style={[styles.execSection, { flexDirection: 'row', gap: 40 }]} wrap={false}>
        {data.resumeLanguages.filter(l => l.name.trim()).length > 0 && (
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>{strings.languages.toUpperCase()}</Text>
            {data.resumeLanguages.filter(l => l.name.trim()).map((lang) => (
              <Text key={lang.id} style={{ fontSize: size.base - 0.5, marginBottom: 4 }}>
                <Text style={{ fontFamily: fontBold }}>{lang.name}</Text> : {lang.level === 3 ? (isFrench ? 'Courant' : 'Fluent') : lang.level === 2 ? (isFrench ? 'Intermédiaire' : 'Intermediate') : (isFrench ? 'Notions' : 'Basic')}
              </Text>
            ))}
          </View>
        )}

        {data.interests.filter(i => i.name.trim()).length > 0 && (
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>{strings.interests.toUpperCase()}</Text>
            <Text style={{ fontSize: size.base - 0.5, lineHeight: 1.4, color: '#444444' }}>
              {data.interests.filter(i => i.name.trim()).map(i => i.name).join(', ')}
            </Text>
          </View>
        )}
      </View>
    </Page>
  );

  return (
    <Document>
      {settings.template === 'classic' && renderClassicTemplate()}
      {settings.template === 'modern' && renderModernTemplate()}
      {settings.template === 'executive' && renderExecutiveTemplate()}
    </Document>
  );
}
