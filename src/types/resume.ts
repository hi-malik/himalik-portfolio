export interface Resume {
  name?: string;
  headline?: string;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  summary?: string;
  skills?: Record<string, string[]> | string[];
  experience?: Array<{
    company?: string;
    role?: string;
    duration?: string;
    location?: string;
    bullets?: string[];
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    tech?: string[];
    link?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    duration?: string;
    location?: string;
  }>;
  certifications?: string[];
}
