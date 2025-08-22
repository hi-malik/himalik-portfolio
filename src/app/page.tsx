import Link from "next/link";
import resume from "@/data/himanshu_resume.json";
import type { Resume } from "@/types/resume";

export default function Home() {
  const resumeData = resume as Resume;
  const contact = resumeData.contact || {};
  const skills = resumeData.skills || {};
  const experience = resumeData.experience || [];
  const projects = resumeData.projects || [];
  const education = resumeData.education || [];
  const companyLogoMap: Record<string, string> = {
    "google": "/logos-2/Google__G__logo.svg.png",
    "goldman sachs": "/logos-2/GoldManSachs.png",
    "cisco": "/logos-2/cisco-systems.png",
    "reconvert": "/logos-2/reconvert.png",
    "arkiter": "/logos/arkiter.svg",
    "leetcode": "/logos-2/LeetCode.png",
    "amazon": "/logos-2/amazon.png",
    "figbytes": "/logos/figbytes.svg",
  };
  const getCompanyLogo = (company?: string) => {
    if (!company) return "/logos/default.svg";
    const normalized = company.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
    const bestKey = Object.keys(companyLogoMap).find(k => normalized.startsWith(k)) || "";
    return bestKey ? companyLogoMap[bestKey] : "/logos/default.svg";
  };
  const schoolLogoMap: Record<string, string> = {
    "coventry": "/logos-2/coventry-university.png",
  };
  const getSchoolLogo = (school?: string) => {
    if (!school) return "/logos/default.svg";
    const normalized = school.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
    const bestKey = Object.keys(schoolLogoMap).find(k => normalized.startsWith(k)) || "";
    return bestKey ? schoolLogoMap[bestKey] : "/logos/default.svg";
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="mx-auto max-w-5xl px-6 pt-16 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{resumeData.name}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {resumeData.headline || "Tech Lead"}
            </p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {contact.email && <p>
              <a className="hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>}
            {contact.phone && <p>
              <a className="hover:underline" href={`tel:${contact.phone.replace(/\s+/g,'')}`}>{contact.phone}</a>
            </p>}
            <div className="flex gap-3 flex-wrap">
              <Link className="underline underline-offset-4" href="https://hi-malik.vercel.app" target="_blank">Website</Link>
              {contact.linkedin && <Link className="underline underline-offset-4" href={`https://${contact.linkedin}`} target="_blank">LinkedIn</Link>}
              {contact.github && <Link className="underline underline-offset-4" href={`https://${contact.github}`} target="_blank">GitHub</Link>}
              <Link className="underline underline-offset-4" href="/Himanshu_Malik_Resume.pdf" target="_blank">Download CV</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 space-y-16">
        {resumeData.summary && (
          <section>
            <h2 className="text-xl font-semibold">About</h2>
            <p className="mt-3 leading-7 text-zinc-700 dark:text-zinc-300">{resumeData.summary}</p>
          </section>
        )}

        {skills && Object.keys(skills).length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Skills</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-6">
              {Object.entries(skills as Record<string, string[]>).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm uppercase tracking-wide text-zinc-500">{category}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((s) => (
                      <span key={s} className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {education && education.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Education</h2>
            <ul className="mt-4 space-y-4">
              {education.map((ed, idx: number) => (
                <li key={idx} className="group relative p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-shadow">
                  <span className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-br from-green-300/25 via-green-200/10 to-transparent blur-md"></span>
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <img src={getSchoolLogo(ed.school)} alt={(ed.school || 'School') + ' logo'} width={32} height={32} className="rounded object-contain shrink-0" />
                        <div>
                          <p className="font-medium leading-tight">{ed.school}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">{ed.degree}</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{ed.duration}</p>
                    </div>
                    {ed.location && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{ed.location}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {experience && experience.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Experience</h2>
            <ul className="mt-4 space-y-6">
              {experience.map((ex, idx: number) => (
                <li key={idx} className="group relative p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-shadow">
                  <span className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-br from-green-300/25 via-green-200/10 to-transparent blur-md"></span>
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img src={getCompanyLogo(ex.company)} alt={(ex.company || 'Company') + ' logo'} width={24} height={24} className="rounded" />
                        <div>
                          <p className="font-medium">{ex.company}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{ex.role}</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{ex.duration}</p>
                    </div>
                    {ex.location && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{ex.location}</p>}
                    {ex.bullets && ex.bullets.length > 0 && (
                      <ul className="mt-3 list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
                        {ex.bullets.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {projects && projects.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Projects</h2>
            <ul className="mt-4 space-y-6">
              {projects.map((pr, idx: number) => (
                <li key={idx} className="group relative p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-shadow">
                  <span className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-br from-green-300/25 via-green-200/10 to-transparent blur-md"></span>
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="font-medium">{pr.name}</p>
                      {pr.link && (
                        <Link className="text-sm underline underline-offset-4" href={pr.link} target="_blank">Open</Link>
                      )}
                    </div>
                    {pr.description && (
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{pr.description}</p>
                    )}
                    {pr.tech && pr.tech.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pr.tech.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                    {pr.bullets && pr.bullets.length > 0 && (
                      <ul className="mt-3 list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
                        {pr.bullets.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
