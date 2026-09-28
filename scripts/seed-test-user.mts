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
const { Settings } = await import("../src/lib/profile/types");

export const TEST_USER = "test-user";
export const TEST_RUNNER_TOKEN = "test-runner-token-000000000000";

const { TEST_PROFILE: profile } = await import("./test-profile.mjs");

const settings = Settings.parse({
  firstName: "John", lastName: "Doe", email: profile.email, phone: profile.phone, phoneCountry: "India", location: profile.location, gender: "Male",
  linkedin: `https://${profile.linkedin}`, github: `https://${profile.github}`, website: `https://${profile.website}`,
  heardFrom: "LinkedIn", workAuthorizedCountries: "India", sponsorshipElsewhere: "Yes", needsSponsorship: "No", willingToRelocate: "Yes", openToOnsite: "Yes",
  noticePeriod: "30 days", currentCompany: "Northwind Labs", currentTitle: "Software Engineer", yearsExperience: "4", salaryExpectation: "",
  runnerToken: TEST_RUNNER_TOKEN, notifyEmail: "", resumeDefault: "best"
});

await saveProfile(TEST_USER, profile);
await saveSettings(TEST_USER, settings);
await saveRunnerToken(TEST_RUNNER_TOKEN, TEST_USER);
console.log(`Test identity ready in .data/users/${TEST_USER}: ${profile.name}, ${profile.email}. Runner token: ${TEST_RUNNER_TOKEN}`);
