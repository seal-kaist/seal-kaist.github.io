import type { Metadata } from "next";
import { sitePath } from "@/lib/site-path";
import { UserPlus } from "lucide-react";
import { FaGithub, FaGlobe, FaLinkedin } from "react-icons/fa6";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site-chrome";

export const dynamic = "force-static";

type ProfileLinksProps = {
  name: string;
  website: string;
  github?: string;
  scholar?: string;
  linkedin?: string;
};

const students: Array<
  ProfileLinksProps & {
    image: string;
    role: string;
  }
> = [
  {
    name: "Heejun Kim",
    role: "M.S. Student",
    image: "https://heejunkim00.github.io/Image/heejun/selfpicture3.jpg",
    website: "https://heejunkim00.github.io/about.html",
    github: "https://github.com/heejunkim00",
    scholar: "https://scholar.google.com/citations?user=8mr04CUAAAAJ&hl=ko",
  },
  {
    name: "JunYoung Lee",
    role: "Undergraduate Student",
    image: "https://ahavaujun.github.io/img/junyoung.jpg",
    website: "https://ahavaujun.github.io/",
    github: "https://github.com/ahavaujun",
  },
  {
    name: "SangLyul Cho",
    role: "Undergraduate Student",
    image: "https://billcho.net/_next/static/media/chosanglyul.11b231ad.jpg",
    website: "https://billcho.net/about",
    github: "https://github.com/chosanglyul",
    scholar: "https://scholar.google.com/citations?user=hwR7WVoAAAAJ",
    linkedin: "https://www.linkedin.com/in/sanglyul-cho-69b553246",
  },
];

function ProfileLinks({
  name,
  website,
  github,
  scholar,
  linkedin,
}: ProfileLinksProps) {
  return (
    <div className="profile-socials" aria-label={`${name} profile links`}>
      <a
        href={website}
        target="_blank"
        rel="noreferrer"
        aria-label={`${name} website`}
        title="Website"
      >
        <FaGlobe aria-hidden="true" />
      </a>
      {scholar ? (
        <a
          href={scholar}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} Google Scholar`}
          title="Google Scholar"
        >
          <img
            className="scholar-icon"
            src="https://sehoonkim.org/img/scholar.png"
            alt=""
            aria-hidden="true"
          />
        </a>
      ) : null}
      {github ? (
        <a
          href={github}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} GitHub`}
          title="GitHub"
        >
          <FaGithub aria-hidden="true" />
        </a>
      ) : null}
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} LinkedIn`}
          title="LinkedIn"
        >
          <FaLinkedin aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

export const metadata: Metadata = {
  title: "People",
  description: "Meet the people of the Scalable & Efficient AI Lab at KAIST.",
  openGraph: {
    title: "People — SEAL at KAIST",
    description: "Meet the people of the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "People — SEAL at KAIST",
    description: "Meet the people of the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
};

export default function PeoplePage() {
  return (
    <main>
      <SiteHeader />
      <PageIntro
        title="People"
        description="Faculty, students, and researchers in the Scalable & Efficient AI Lab at KAIST."
      />

      <section className="people-section shell">
        <h2 className="people-heading">Principal investigator</h2>
        <article className="profile-panel">
          <a
            className="profile-image"
            href="https://sehoonkim.org/"
            target="_blank"
            rel="noreferrer"
            aria-label="Sehoon Kim website"
          >
            <img
              src={sitePath("/sehoon-kim.jpg")}
              alt="Professor Sehoon Kim"
            />
          </a>
          <div className="profile-details">
            <div>
              <h2>
                <a href="https://sehoonkim.org/" target="_blank" rel="noreferrer">
                  Sehoon Kim
                </a>
              </h2>
              <p className="profile-role">Assistant Professor · KAIST AI</p>
            </div>
            <p>
              Sehoon works on AI systems, efficient AI, and large language
              models. Before joining KAIST, he was a Member of Technical Staff
              at xAI, where he built Grok with a focus on inference and RL
              infrastructure. He earned his Ph.D. in Computer Science from UC
              Berkeley.
            </p>
            <ProfileLinks
              name="Sehoon Kim"
              website="https://sehoonkim.org/"
              scholar="https://scholar.google.com/citations?user=zQABr7QAAAAJ&hl=en"
              github="https://github.com/kssteven418"
              linkedin="https://www.linkedin.com/in/sehoon-kim-13a1b51b1/"
            />
          </div>
        </article>
      </section>

      <section className="student-section shell">
        <h2 className="people-heading">Students</h2>
        <div className="student-grid">
          {students.map((student) => (
            <article className="student-card" key={student.name}>
              <a
                className="student-image"
                href={student.website}
                target="_blank"
                rel="noreferrer"
                aria-label={`${student.name} website`}
              >
                <img src={student.image} alt={student.name} />
              </a>
              <div className="student-details">
                <h3>
                  <a href={student.website} target="_blank" rel="noreferrer">
                    {student.name}
                  </a>
                </h3>
                <p>{student.role}</p>
                <ProfileLinks {...student} />
              </div>
            </article>
          ))}
          <article className="student-card prospective-card">
            <a
              className="student-image prospective-image"
              href={sitePath("/join")}
              aria-label="Prospective student application information"
            >
              <UserPlus aria-hidden="true" />
            </a>
            <div className="student-details">
              <h3>
                <a href={sitePath("/join")}>Prospective student</a>
              </h3>
              <p>Join SEAL</p>
            </div>
          </article>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
