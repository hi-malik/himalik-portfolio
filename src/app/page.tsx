import Link from "next/link";
import resume from "@/data/resume.json";
import type { Resume } from "@/types/resume";

export default function Home() {
  const resumeData = resume as Resume;
  const contact = resumeData.contact || {};
  const skills = resumeData.skills || {};
  const experience = resumeData.experience || [];
  const projects = resumeData.projects || [];
  const education = resumeData.education || [];
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="mx-auto max-w-5xl px-6 pt-16 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{resumeData.name}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {resumeData.headline || "Software Engineer"}
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
              {contact.website && <Link className="underline underline-offset-4" href={`https://${contact.website}`} target="_blank">Website</Link>}
              {contact.linkedin && <Link className="underline underline-offset-4" href={`https://${contact.linkedin}`} target="_blank">LinkedIn</Link>}
              {contact.github && <Link className="underline underline-offset-4" href={`https://${contact.github}`} target="_blank">GitHub</Link>}
              <Link className="underline underline-offset-4" href="/Shakunt_Malik_Resume.pdf" target="_blank">Download CV</Link>
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
                <li key={idx} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium">{ed.school}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{ed.degree}</p>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{ed.duration}</p>
                  </div>
                  {ed.location && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{ed.location}</p>}
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
                <li key={idx} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium">{ex.company}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{ex.role}</p>
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
                </li>
              ))}
            </ul>
          </section>
        )}

        {projects && projects.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">Projects</h2>
            <ul className="mt-4 grid sm:grid-cols-2 gap-6">
              {projects.map((pr, idx: number) => (
                <li key={idx} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{pr.name}</p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{pr.description}</p>
                      {pr.tech && pr.tech.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pr.tech.map((t: string) => (
                            <span key={t} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-xs">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {pr.link && (
                      <Link className="text-sm underline underline-offset-4" href={pr.link} target="_blank">Open</Link>
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
