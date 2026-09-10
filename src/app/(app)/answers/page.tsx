import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { saveSettingsAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; hint: string; fields: [keyof Settings, string, string?][] }[] = [
  { title: "Contact", hint: "Typed into the top of every form.", fields: [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email on applications"], ["phone", "Phone", "+91 98765 43210"], ["phoneCountry", "Phone country", "India"], ["location", "Current city", "Gurugram, India"]] },
  { title: "Links", hint: "Used whenever a form asks for a profile or portfolio.", fields: [["linkedin", "LinkedIn URL"], ["github", "GitHub URL"], ["website", "Website"]] },
  { title: "Work", hint: "Answers for the usual screening questions.", fields: [["currentCompany", "Current company"], ["currentTitle", "Current title"], ["yearsExperience", "Years of experience", "5"], ["noticePeriod", "Notice period or earliest start", "30 days"], ["salaryExpectation", "Salary expectation, if you want it filled"], ["heardFrom", "How you heard about jobs", "LinkedIn"]] }
];

export default async function AnswersPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const uid = await requireUserId();
  const { saved } = await searchParams;
  const s = Settings.parse((await getSettings(uid)) ?? {});
  return (
    <div className="space-y-8">
      <PageHeader title="Answers" description="What the form filler already knows about you. Anything a form asks that is not covered here comes back to you as an open question." />
      <form action={saveSettingsAction} className="space-y-5">
        {GROUPS.map((g) => (
          <section key={g.title} className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
            <div><h2 className="text-[15px] font-semibold">{g.title}</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">{g.hint}</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map(([k, label, ph]) => <label key={k} className="text-[13px]"><span className="text-muted">{label}</span><input name={k} defaultValue={s[k] as string} placeholder={ph} className="field mt-1.5" /></label>)}
            </div>
          </section>
        ))}
        <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
          <div><h2 className="text-[15px] font-semibold">Work authorization</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Sponsorship questions are answered per job: No when the job is in a country listed here, your answer below everywhere else, and left for you when the country is unclear, as with fully remote roles.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[13px]"><span className="text-muted">Countries where you can work without sponsorship</span><input name="workAuthorizedCountries" defaultValue={s.workAuthorizedCountries} placeholder="India, United Kingdom" className="field mt-1.5" /></label>
            <label className="text-[13px]"><span className="text-muted">Outside those countries, do you need sponsorship?</span><select name="sponsorshipElsewhere" defaultValue={s.sponsorshipElsewhere} className="field mt-1.5"><option>Yes</option><option>No</option></select></label>
            <label className="text-[13px]"><span className="text-muted">Willing to relocate?</span><select name="willingToRelocate" defaultValue={s.willingToRelocate} className="field mt-1.5"><option>Yes</option><option>No</option></select></label>
            <label className="text-[13px]"><span className="text-muted">Open to on-site or hybrid?</span><select name="openToOnsite" defaultValue={s.openToOnsite} className="field mt-1.5"><option>Yes</option><option>No</option></select></label>
          </div>
        </section>
        <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
          <div><h2 className="text-[15px] font-semibold">Notifications</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Resume ready, form filled and submitted events go here.</p></div>
          <label className="text-[13px] sm:max-w-[calc(50%-0.5rem)]"><span className="text-muted">Email for notifications</span><input name="notifyEmail" defaultValue={s.notifyEmail} className="field mt-1.5" /></label>
        </section>
        <div className="sticky bottom-4 flex items-center justify-end gap-3">{saved && <span className="text-[13px] text-go">Saved.</span>}<SubmitButton pending="Saving" className="btn-primary lift">Save answers</SubmitButton></div>
      </form>
    </div>
  );
}
