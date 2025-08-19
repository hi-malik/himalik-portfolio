import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

type Resume = {
  name?: string;
  headline?: string;
  contact?: { email?: string; phone?: string; location?: string; website?: string; linkedin?: string; github?: string };
  summary?: string;
  skills?: Record<string, string[]> | string[];
  experience?: Array<{ company?: string; role?: string; duration?: string; location?: string; bullets?: string[] }>;
  projects?: Array<{ name?: string; description?: string; tech?: string[]; link?: string }>;
  education?: Array<{ school?: string; degree?: string; duration?: string; location?: string }>;
  certifications?: string[];
};

function parseSections(text: string) {
  const allLines = text.split('\n');
  const lines = allLines.map(l => l.trim());
  const content = lines.join('\n');

  const headerLabels = [
    { key: 'summary', label: /\b(?:Summary|Objective)\b/i },
    { key: 'education', label: /\bEducation\b/i },
    { key: 'experience', label: /\b(?:Professional\s+)?Experience\b/i },
    { key: 'skills', label: /\b(?:Technical\s+Skills|Skills|SKILLS)\b/i },
    { key: 'projects', label: /\bProjects\b/i },
    { key: 'certifications', label: /\bCertifications\b/i },
  ];

  const positions: Array<{ key: string; index: number; matchText: string }> = [];
  for (const h of headerLabels) {
    const m = content.match(h.label);
    if (m && typeof m.index === 'number') {
      positions.push({ key: h.key, index: m.index, matchText: m[0] });
    }
  }
  positions.sort((a, b) => a.index - b.index);

  const sections: Record<string, string> = {};
  // header: from start to first header
  const firstHeaderIdx = positions.length > 0 ? positions[0].index : content.length;
  sections['header'] = content.slice(0, firstHeaderIdx).trim();
  for (let i = 0; i < positions.length; i++) {
    const { key, index, matchText } = positions[i];
    const start = index + matchText.length;
    const end = i + 1 < positions.length ? positions[i + 1].index : content.length;
    sections[key] = content.slice(start, end).trim();
  }

  return { lines: lines.filter(l => l.length > 0), content, sections };
}

function extractHeader(lines: string[]): Partial<Resume> {
  const header: Partial<Resume> = {};
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const firstLine = nonEmpty[0] || '';
  const secondLine = nonEmpty[1] || '';
  if (firstLine) header.name = firstLine.trim();
  // second line is contact separated by '|'
  const parts = secondLine.split('|').map(s => s.trim()).filter(Boolean);
  const contact: Required<NonNullable<Resume['contact']>> = {
    email: parts.find(p => /@/.test(p)) || '',
    phone: parts.find(p => /\+?\d[\d\s().-]{7,}\d/.test(p)) || '',
    website: parts.find(p => /\./.test(p) && !/@/.test(p) && /malik|sha256|http/i.test(p)) || '',
    linkedin: parts.find(p => /linkedin\.com/i.test(p)) || '',
    github: parts.find(p => /github\.com/i.test(p)) || '',
    location: '',
  };
  header.contact = contact;
  return header;
}

function extractList(section: string): string[] {
  return section
    .split(/\n|•|\u2022|\-/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^\b(?:Skills|Technical Skills|SKILLS)\b/i.test(s));
}

function extractExperience(section: string): Resume['experience'] {
  const items: NonNullable<Resume['experience']> = [];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  const monthRe = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i;
  const durationRe = new RegExp(`${monthRe.source}[^\n]*?\b\d{4}\b\s*[–-]\s*(?:${monthRe.source}[^\n]*?\b\d{4}\b|Present)`, 'i');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // identify company+duration on one line
    if (/(\b\d{4}\b|Present)/.test(line) && /[A-Za-z]/.test(line)) {
      const durMatch = line.match(durationRe);
      let company = line;
      let duration = '';
      if (durMatch && durMatch.index !== undefined) {
        company = line.slice(0, durMatch.index).trim();
        duration = line.slice(durMatch.index).trim();
      }
      // next line may contain role + location
      let role = '';
      let location = '';
      if (i + 1 < lines.length) {
        const rl = lines[i + 1];
        // try split by last comma
        const commaIdx = rl.lastIndexOf(',');
        if (commaIdx !== -1) {
          role = rl.slice(0, commaIdx).trim();
          location = rl.slice(commaIdx + 1).trim();
        } else {
          role = rl.trim();
        }
        i += 2;
      } else {
        i += 1;
      }
      // collect bullets: pattern is '•' lines followed by text lines
      const bullets: string[] = [];
      while (i < lines.length) {
        if (/(\b\d{4}\b|Present)/.test(lines[i])) break;
        if (lines[i] === '•' && i + 1 < lines.length) {
          const bulletText = lines[i + 1];
          bullets.push(bulletText);
          i += 2;
        } else if (lines[i].startsWith('• ')) {
          bullets.push(lines[i].replace(/^•\s*/, ''));
          i += 1;
        } else {
          // continuation lines for previous bullet
          if (bullets.length > 0) {
            bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${lines[i]}`.trim();
          } else {
            // stray text; treat as a bullet
            bullets.push(lines[i]);
          }
          i += 1;
        }
      }
      items.push({ company, role, duration, location, bullets });
      continue;
    }
    i += 1;
  }
  return items;
}

function extractProjects(section: string): Resume['projects'] {
  const items: NonNullable<Resume['projects']> = [];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  let current: NonNullable<Resume['projects']>[number] | null = null;
  for (const line of lines) {
    if (/^[A-Z].{0,60}$/.test(line)) {
      if (current) items.push(current);
      current = { name: line, description: '', tech: [], link: undefined };
    } else if (/https?:\/\//i.test(line)) {
      current = current || { name: 'Project', description: '', tech: [], link: undefined };
      current.link = (line.match(/https?:\/\/\S+/i)?.[0] || line).trim();
    } else if (/\b(React|Next|Node|TypeScript|Tailwind|Python|AWS|GCP|Docker|Kubernetes|Postgres|MongoDB)\b/i.test(line)) {
      current = current || { name: 'Project', description: '', tech: [], link: undefined };
      current.tech = Array.from(new Set([...(current.tech || []), ...line.split(/[,•]\s*/).map(s => s.trim())]));
    } else {
      current = current || { name: 'Project', description: '', tech: [], link: undefined };
      current.description = [current.description, line].filter(Boolean).join(' ');
    }
  }
  if (current) items.push(current);
  return items;
}

function extractEducation(section: string): Resume['education'] {
  const items: NonNullable<Resume['education']> = [];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const schoolAndLoc = lines[0];
    const degreeAndDuration = lines[1];
    const lastComma = schoolAndLoc.lastIndexOf(',');
    let school = schoolAndLoc;
    let location = '';
    if (lastComma !== -1) {
      location = schoolAndLoc.slice(schoolAndLoc.lastIndexOf(' ', lastComma - 1) + 1).trim();
      school = schoolAndLoc.slice(0, schoolAndLoc.length - location.length).trim();
    }
    const dateIdx = degreeAndDuration.search(/\b(?:Jan\.|Feb\.|Mar\.|Apr\.|May|Jun\.|Jul\.|Aug\.|Sep\.|Oct\.|Nov\.|Dec\.)\s*\d{4}\b/i);
    let degree = degreeAndDuration;
    let duration = '';
    if (dateIdx !== -1) {
      degree = degreeAndDuration.slice(0, dateIdx).trim();
      duration = degreeAndDuration.slice(dateIdx).trim();
    }
    items.push({ school, degree, duration, location });
  }
  return items;
}

function extractSkills(section: string): Resume['skills'] {
  const skills: Record<string, string[]> = {};
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (m) {
      const category = m[1].trim();
      const raw = m[2].trim();
      const parts = raw
        .split(/[,/]/)
        .map(s => s.trim())
        .flatMap(s => s.split(/\s{2,}/))
        .map(s => s.trim())
        .filter(Boolean);
      skills[category] = Array.from(new Set(parts));
    }
  }
  return skills;
}

async function main() {
  const resumePdfPath = path.resolve(process.cwd(), '..', 'Shakunt_Malik_Resume (1).pdf');
  const outJsonPath = path.resolve(process.cwd(), 'src', 'data', 'resume.json');
  const outRawPath = path.resolve(process.cwd(), 'src', 'data', 'resume_raw.txt');
  const publicPdfPath = path.resolve(process.cwd(), 'public', 'Shakunt_Malik_Resume.pdf');
  const pdfBuffer = await fs.readFile(resumePdfPath);
  const parsed = await pdf(pdfBuffer);
  const { lines, sections } = parseSections(parsed.text);

  const resume: Resume = {
    ...extractHeader(lines),
    summary: sections.summary?.replace(/^\b(?:Summary|Objective)\b/i, '').trim() || undefined,
    skills: extractSkills(sections.skills || ''),
    experience: extractExperience(sections.experience || undefined || ''),
    projects: extractProjects(sections.projects || ''),
    education: extractEducation(sections.education || ''),
    certifications: extractList(sections.certifications || ''),
  };

  await fs.mkdir(path.dirname(outJsonPath), { recursive: true });
  await fs.writeFile(outJsonPath, JSON.stringify(resume, null, 2), 'utf-8');
  await fs.writeFile(outRawPath, parsed.text, 'utf-8');
  console.log(`Wrote resume JSON to ${outJsonPath}`);
  console.log(`Wrote raw text to ${outRawPath}`);
  // Copy PDF to public for download
  await fs.mkdir(path.dirname(publicPdfPath), { recursive: true });
  await fs.writeFile(publicPdfPath, pdfBuffer);
  console.log(`Copied resume PDF to ${publicPdfPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


