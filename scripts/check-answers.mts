/** Quick check of the default-answer rules against labels seen on real forms. `npx tsx scripts/check-answers.mts` */
import { answerFor } from "../src/lib/defaults";
import { Settings } from "../src/lib/profile/types";

const s = Settings.parse({ firstName: "John", lastName: "Doe", email: "john.doe@example.com", phone: "+1 555 010 0199", location: "Bengaluru, India", github: "https://github.com/john-doe-test", noticePeriod: "30 days", yearsExperience: "4", workAuthorizedCountries: "India" });
const cases: [string, string[] | undefined, string | undefined][] = [
  ["Are you currently located in the New York area?", ["Yes", "No"], undefined],
  ["Current location", undefined, "Bengaluru, India"],
  ["GitHub URL", undefined, "https://github.com/john-doe-test"],
  ["GitHub", undefined, "https://github.com/john-doe-test"],
  ["Please respond truthfully. How many years of professional experience do you have with CI/CD using GitHub Actions/GitLab CI?", ["Less than 2 years", "2-3 years", "More than 3 years"], undefined],
  ["What is your notice period?", ["Immediate Joiner", "30-45 days", "60 days", "90 days", "90+ days"], "30-45 days"],
  ["What is your notice period?", ["Less than 30 days", "More than 30 days"], "Less than 30 days"],
  ["When is your earliest realistic start date?", ["I am available immediately", "I can start within 30 days", "I can start within 45 days"], "I can start within 30 days"],
  ["Notice period", undefined, "30 days"],
  ["Do you have 3+ years of experience?", ["Yes", "No"], "Yes"]
];
let bad = 0;
for (const [label, options, want] of cases) {
  const got = answerFor(s, label, options, options ? "select" : "text")?.value;
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label.slice(0, 70)} -> ${JSON.stringify(got)}${ok ? "" : ` (wanted ${JSON.stringify(want)})`}`);
}
process.exit(bad ? 1 : 0);
