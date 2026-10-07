/** The fictional applicant used by the test runner and the landing page sample. No real person's details. */
import { Profile } from "../src/lib/profile/types";

export const TEST_PROFILE = Profile.parse({
  name: "John Doe",
  phone: "+91 98765 43210",
  email: "john.doe@example.com",
  linkedin: "linkedin.com/in/john-doe-test",
  github: "github.com/john-doe-test",
  website: "john-doe-test.example.com",
  location: "Bengaluru, India",
  gender: "Male",
  education: [
    { school: "Anna University", place: "Chennai, India", degree: "Bachelor of Engineering in Computer Science and Engineering", dates: "August 2017 – May 2021", gpa: "8.6/10" }
  ],
  roles: [
    { company: "Northwind Labs", title: "Software Engineer", location: "Bengaluru, India", start: "July 2021", end: "Present", bullets: [
      { id: "nw1", tags: ["backend"], text: "Built a FastAPI service that processes 2 million events a day with p95 latency under 120ms." },
      { id: "nw2", tags: ["backend"], text: "Designed a retry and dead-letter pipeline on SQS that cut failed jobs by 70% in the first quarter." },
      { id: "nw3", tags: ["frontend"], text: "Shipped a React dashboard used by 300 internal users, replacing three spreadsheets." },
      { id: "nw4", tags: ["ai"], text: "Prototyped an LLM assistant for support tickets with retrieval over 40,000 documents, adopted by two teams." },
      { id: "nw5", tags: ["platform"], text: "Moved deployments to GitHub Actions and Kubernetes, taking release time from 2 hours to 15 minutes." },
      { id: "nw6", tags: ["backend"], text: "Split a monolithic ingestion job into four Python workers, so one bad partner feed no longer blocks the rest." },
      { id: "nw7", tags: ["platform"], text: "Added structured logging and Grafana dashboards that the on-call rotation now uses for every incident." },
      { id: "nw8", tags: ["platform"], text: "Wrote the runbook for queue backlogs and led two game days that rehearsed it with the support team." },
      { id: "nw9", tags: ["frontend"], text: "Rebuilt the admin console in Next.js and TypeScript, cutting page load from 4 seconds to under 1 second." }
    ] },
    { company: "Contoso Analytics", title: "Software Engineering Intern", location: "Chennai, India", start: "May 2020", end: "July 2020", bullets: [
      { id: "ct1", tags: ["data"], text: "Wrote ETL jobs in Python and SQL that loaded 5 GB of daily sales data into a reporting warehouse." },
      { id: "ct2", tags: ["data"], text: "Added data quality checks that caught missing store uploads before the morning report went out." }
    ] }
  ],
  projects: [
    { name: "Ledgerlite", stack: "TypeScript, Next.js, PostgreSQL", year: "2025", tags: ["fullstack"], bullets: ["Personal finance tracker with 1,200 monthly users and a plugin system for bank statement formats.", "Implemented row-level security and an audit log; zero data incidents in 18 months."] },
    { name: "Promptbench", stack: "Python, OpenAI API", year: "2024", tags: ["ai"], bullets: ["Harness that scores prompt variants against 500 labelled examples and reports regressions in CI."] }
  ],
  skills: { Languages: ["Python", "TypeScript", "SQL", "Go"], Backend: ["FastAPI", "Node.js", "PostgreSQL", "Redis", "SQS"], Frontend: ["React", "Next.js", "Tailwind"], Cloud: ["AWS", "Kubernetes", "Docker", "GitHub Actions", "Grafana"], AI: ["OpenAI API", "Retrieval", "Evaluation harnesses"] },
  coursework: ["Data Structures", "Operating Systems", "Databases", "Computer Networks", "Distributed Systems", "Algorithms"],
  achievements: ["Winner, Smart India Hackathon 2020 (software edition), out of 1,000+ teams.", "Ranked in the top 2% of JEE Main 2017."]
});
