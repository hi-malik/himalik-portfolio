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
  projects?: Array<{ name?: string; description?: string; tech?: string[]; link?: string; bullets?: string[] }>;
  education?: Array<{ school?: string; degree?: string; duration?: string; location?: string }>;
  certifications?: string[];
};

function parseSections(text: string) {
  const allLines = text.split('\n');
  const lines = allLines.map(l => l.trim());
  const content = lines.join('\n');

  const headerLabels = [
    { key: 'summary', label: /(?:Summary|Objective)/i },
    { key: 'education', label: /Education/i },
    { key: 'experience', label: /(?:Professional\s+)?Experience/i },
    { key: 'skills', label: /(?:Technical\s+Skills|Skills|SKILLS)/i },
    { key: 'projects', label: /Projects/i },
    { key: 'certifications', label: /Certifications/i },
  ];

  const headerLines: Array<{ key: string; lineIndex: number }> = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const h of headerLabels) {
      if (seen.has(h.key)) continue;
      const anchored = new RegExp(`^${h.label.source}$`, 'i');
      if (anchored.test(line)) {
        headerLines.push({ key: h.key, lineIndex: i });
        seen.add(h.key);
      }
    }
  }
  headerLines.sort((a, b) => a.lineIndex - b.lineIndex);

  const sections: Record<string, string> = {};
  const firstHeaderLine = headerLines.length > 0 ? headerLines[0].lineIndex : lines.length;
  sections['header'] = lines.slice(0, firstHeaderLine).join('\n').trim();
  for (let i = 0; i < headerLines.length; i++) {
    const { key, lineIndex } = headerLines[i];
    const start = lineIndex + 1; // exclude the header line itself
    const end = i + 1 < headerLines.length ? headerLines[i + 1].lineIndex : lines.length;
    sections[key] = lines.slice(start, end).join('\n').trim();
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
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // identify company+duration on one line
    if (/(\b\d{4}\b|Present)/.test(line) && /[A-Za-z]/.test(line)) {
      let company = line;
      let duration = '';
      const m = line.match(monthRe);
      if (m && typeof m.index === 'number') {
        company = line.slice(0, m.index).trim();
        duration = line.slice(m.index).trim();
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

  function ensureCurrent(defaultName = 'Project') {
    if (!current) current = { name: defaultName, description: '', tech: [], link: undefined, bullets: [] };
  }

  function addTech(raw: string) {
    ensureCurrent();
    const parts = raw
      .split(/[,/|]/)
      .map(s => s.trim())
      .flatMap(s => s.split(/\s{2,}/))
      .map(s => s.replace(/[()]/g, '').trim())
      .filter(Boolean);
    const set = new Set([...(current!.tech || []), ...parts]);
    current!.tech = Array.from(set);
  }

  const techWord = /\b(React|Next|Node|Type\s*Script|TypeScript|Tailwind|Python|AWS|GCP|Docker|Kubernetes|Postgres|MongoDB|Java\b|Spring\s*Boot|JavaScript|C\+\+|C\#|SFML|Terraform|Prometheus|Grafana|Jenkins|CI\b|CD\b|Microservices)\b/i;
  let bulletsStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^OTHERS$/i.test(line)) {
      if (current) items.push(current);
      break;
    }
    // New project header when line contains a title|tech delimiter
    if (line.includes('|')) {
      if (current) items.push(current);
      const [left, right] = line.split('|', 2);
      current = { name: left.trim(), description: '', tech: [], link: undefined, bullets: [] };
      if (right) addTech(right);
      bulletsStarted = false;
      continue;
    }
    // URL line attaches as link
    if (/https?:\/\//i.test(line)) {
      ensureCurrent();
      current!.link = (line.match(/https?:\/\/\S+/i)?.[0] || line).trim();
      continue;
    }
    // Bullet lines
    if (line === '•' && i + 1 < lines.length) {
      ensureCurrent();
      current!.bullets = [...(current!.bullets || []), lines[i + 1]];
      i += 1;
      bulletsStarted = true;
      continue;
    }
    if (line.startsWith('• ')) {
      ensureCurrent();
      current!.bullets = [...(current!.bullets || []), line.replace(/^•\s*/, '')];
      bulletsStarted = true;
      continue;
    }
    // If we've started bullets for this project, treat subsequent lines as bullet continuations
    if (bulletsStarted && current && (current.bullets?.length || 0) > 0) {
      const lastIdx = current.bullets!.length - 1;
      current.bullets![lastIdx] = `${current.bullets![lastIdx]} ${line}`.trim();
      continue;
    }
    // Lines that look like tech-only lines
    const looksLikeTech = techWord.test(line) && !/[.!?]$/.test(line) && line.split(/\s+/).length <= 8;
    if (looksLikeTech) {
      addTech(line);
      continue;
    }
    // Otherwise accumulate description or continue the last bullet if bullets started
    ensureCurrent();
    current!.description = [current!.description, line].filter(Boolean).join(' ');
  }
  if (current) items.push(current);

  // Deduplicate by normalized name, keep entry with more info (more bullets + more tech + longer description)
  const byName = new Map<string, NonNullable<Resume['projects']>[number]>();
  function richness(p: NonNullable<Resume['projects']>[number]) {
    return (p.bullets?.join(' ').length || 0) + (p.tech?.join(' ').length || 0) + (p.description?.length || 0);
  }
  for (const p of items) {
    const key = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!byName.has(key)) {
      byName.set(key, p);
    } else {
      const existing = byName.get(key)!;
      if (richness(p) > richness(existing)) byName.set(key, p);
    }
  }
  return Array.from(byName.values());
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
  const resumePdfPath = path.resolve(process.cwd(), '..', 'Himanshu_Malik_Resume G.pdf');
  const outJsonPath = path.resolve(process.cwd(), 'src', 'data', 'himanshu_resume.json');
  const outRawPath = path.resolve(process.cwd(), 'src', 'data', 'himanshu_resume_raw.txt');
  const publicPdfPath = path.resolve(process.cwd(), 'public', 'Himanshu_Malik_Resume.pdf');
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


