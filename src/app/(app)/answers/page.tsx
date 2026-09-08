import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { saveSettingsAction } from "../../actions";

export const dynamic = "force-dynamic";

const FIELDS: [keyof Settings, string, string?][] = [
  ["firstName", "First name"], ["lastName", "Last name"], ["email", "Email on applications"], ["phone", "Phone, with country code"], ["location", "Current city"],
  ["linkedin", "LinkedIn URL"], ["github", "GitHub URL"], ["website", "Website"], ["heardFrom", "How you heard about jobs"],
  ["noticePeriod", "Notice period or earliest start"], ["currentCompany", "Current company"], ["currentTitle", "Current title"], ["yearsExperience", "Years of experience"], ["salaryExpectation", "Salary expectation, if you want it filled"], ["notifyEmail", "Where to send notifications"]
];

export default async function AnswersPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const uid = await requireUserId();
  const { saved } = await searchParams;
  const s = Settings.parse((await getSettings(uid)) ?? {});
  return (
    <div className="space-y-8">
      <div><h1 className="serif text-4xl">Answers</h1><p className="mt-2 max-w-2xl text-sm text-muted">What the form filler already knows about you. Anything a form asks that is not covered here is sent to you as an open question.</p></div>
      <form action={saveSettingsAction} className="space-y-6">
        <section className="panel grid gap-4 p-5 md:grid-cols-2">
          {FIELDS.map(([k, label]) => <label key={k} className="text-sm"><span className="text-muted">{label}</span><input name={k} defaultValue={s[k] as string} className="field mt-1" /></label>)}
        </section>
        <section className="panel grid gap-4 p-5 md:grid-cols-3">
          {([["needsSponsorship", "Do you need visa sponsorship?"], ["willingToRelocate", "Willing to relocate?"], ["openToOnsite", "Open to on-site or hybrid?"]] as [keyof Settings, string][]).map(([k, label]) => (
            <label key={k} className="text-sm"><span className="text-muted">{label}</span><select name={k} defaultValue={s[k] as string} className="field mt-1"><option>Yes</option><option>No</option></select></label>
          ))}
        </section>
        <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm text-go">Saved.</span>}<button className="btn-primary">Save answers</button></div>
      </form>
    </div>
  );
}
