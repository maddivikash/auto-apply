/**
 * A throwaway test identity so real details never touch a form while testing. Writes a fictional
 * profile, standing answers and a runner token into the local .data/ store (the fs backend).
 *
 *   npm run seed:test      then      npm run dev:test      and      npm run runner:test
 *
 * The test runner fills forms but never presses Submit (RUNNER_DRY_RUN=1): a fake application sent
 * to a real employer is spam to them and gets your address flagged, which is what this avoids.
 */
process.env.TURSO_DATABASE_URL = ""; process.env.TURSO_AUTH_TOKEN = ""; process.env.BLOB_READ_WRITE_TOKEN = "";
const { saveProfile, saveSettings, saveRunnerToken } = await import("../src/lib/store");
const { Profile, Settings } = await import("../src/lib/profile/types");

export const TEST_USER = "test-user";
export const TEST_RUNNER_TOKEN = "test-runner-token-000000000000";

const profile = Profile.parse({
  name: "Asha Verma",
  phone: "+91 98765 43210",
  email: "asha.verma.autoapply@example.com",
  linkedin: "linkedin.com/in/asha-verma-test",
  github: "github.com/asha-verma-test",
  website: "asha-verma-test.example.com",
  location: "Bengaluru, India",
  gender: "Female",
  education: [
    { school: "Anna University", place: "Chennai, India", degree: "Bachelor of Engineering in Computer Science and Engineering", dates: "August 2017 – May 2021", gpa: "8.6/10" }
  ],
  roles: [
    { company: "Northwind Labs", title: "Software Engineer", location: "Bengaluru, India", start: "July 2021", end: "Present", bullets: [
      { id: "nw1", tags: ["backend"], text: "Built a FastAPI service that processes 2 million events a day with p95 latency under 120ms." },
      { id: "nw2", tags: ["backend"], text: "Designed a retry and dead-letter pipeline on SQS that cut failed jobs by 70% in the first quarter." },
      { id: "nw3", tags: ["frontend"], text: "Shipped a React dashboard used by 300 internal users, replacing three spreadsheets." },
      { id: "nw4", tags: ["ai"], text: "Prototyped an LLM assistant for support tickets with retrieval over 40,000 documents, adopted by two teams." },
      { id: "nw5", tags: ["platform"], text: "Moved deployments to GitHub Actions and Kubernetes, taking release time from 2 hours to 15 minutes." }
    ] },
    { company: "Contoso Analytics", title: "Software Engineering Intern", location: "Chennai, India", start: "May 2020", end: "July 2020", bullets: [
      { id: "ct1", tags: ["data"], text: "Wrote ETL jobs in Python and SQL that loaded 5 GB of daily sales data into a reporting warehouse." }
    ] }
  ],
  projects: [
    { name: "Ledgerlite", stack: "TypeScript, Next.js, PostgreSQL", year: "2025", tags: ["fullstack"], bullets: ["Personal finance tracker with 1,200 monthly users and a plugin system for bank statement formats.", "Implemented row-level security and an audit log; zero data incidents in 18 months."] },
    { name: "Promptbench", stack: "Python, OpenAI API", year: "2024", tags: ["ai"], bullets: ["Harness that scores prompt variants against 500 labelled examples and reports regressions in CI."] }
  ],
  skills: { Languages: ["Python", "TypeScript", "SQL", "Go"], Backend: ["FastAPI", "Node.js", "PostgreSQL", "Redis", "SQS"], Frontend: ["React", "Next.js", "Tailwind"], Cloud: ["AWS", "Kubernetes", "Docker", "GitHub Actions"], AI: ["OpenAI API", "Retrieval", "Evaluation harnesses"] },
  coursework: ["Data Structures", "Operating Systems", "Databases"],
  achievements: ["Winner, Smart India Hackathon 2020 (software edition)."]
});

const settings = Settings.parse({
  firstName: "Asha", lastName: "Verma", email: profile.email, phone: profile.phone, phoneCountry: "India", location: profile.location, gender: "Female",
  linkedin: `https://${profile.linkedin}`, github: `https://${profile.github}`, website: `https://${profile.website}`,
  heardFrom: "LinkedIn", workAuthorizedCountries: "India", sponsorshipElsewhere: "Yes", needsSponsorship: "No", willingToRelocate: "Yes", openToOnsite: "Yes",
  noticePeriod: "30 days", currentCompany: "Northwind Labs", currentTitle: "Software Engineer", yearsExperience: "4", salaryExpectation: "",
  runnerToken: TEST_RUNNER_TOKEN, notifyEmail: "", resumeDefault: "best"
});

await saveProfile(TEST_USER, profile);
await saveSettings(TEST_USER, settings);
await saveRunnerToken(TEST_RUNNER_TOKEN, TEST_USER);
console.log(`Test identity ready in .data/users/${TEST_USER}: ${profile.name}, ${profile.email}. Runner token: ${TEST_RUNNER_TOKEN}`);
