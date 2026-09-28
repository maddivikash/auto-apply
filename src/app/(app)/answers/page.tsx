import { requireUserId, userEmail } from "@/lib/auth";
import { getProfile, getSettings } from "@/lib/store";
import { withProfileFallback } from "@/lib/apply/answers";
import { Settings } from "@/lib/profile/types";
import { saveSettingsAction, saveBankAction } from "../../actions";
import { getBank } from "@/lib/apply/bank";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; hint: string; fields: [keyof Settings, string, string?][] }[] = [
  { title: "Contact", hint: "Typed into the top of every form.", fields: [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email on applications"], ["phone", "Phone", "+91 98765 43210"], ["phoneCountry", "Phone country", "India"], ["location", "Current city", "Gurugram, India"], ["gender", "Gender for demographic questions", "Male, Female, Non-binary or Prefer not to say"]] },
  { title: "Links", hint: "Used whenever a form asks for a profile or portfolio.", fields: [["linkedin", "LinkedIn URL"], ["github", "GitHub URL"], ["website", "Website"]] },
  { title: "Work", hint: "Answers for the usual screening questions.", fields: [["currentCompany", "Current company"], ["currentTitle", "Current title"], ["yearsExperience", "Years of experience", "5"], ["noticePeriod", "Notice period or earliest start", "30 days"], ["salaryExpectation", "Salary expectation, if you want it filled"], ["heardFrom", "How you heard about jobs", "LinkedIn"]] }
];

export default async function AnswersPage({ searchParams }: { searchParams: Promise<{ saved?: string; from?: string; missing?: string; bank?: string }> }) {
  const uid = await requireUserId();
  const { saved, from, missing, bank: bankSaved } = await searchParams;
  const [settings, profile, email, bank] = await Promise.all([getSettings(uid), getProfile(uid), userEmail(), getBank(uid)]);
  const banked = Object.entries(bank).sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt));
  // Anything the resume already says (name, phone, links, current role) shows here filled in, exactly as the
  // form filler will use it; typing over a value and saving makes that the answer instead.
  const s = withProfileFallback(Settings.parse(settings ?? {}), profile, email);
  return (
    <div className="space-y-8">
      <PageHeader title="Answers" description="What the form filler already knows about you, filled in from your resume where it says. Anything a form asks that is not covered here comes back to you as an open question." />
      {from === "profile" && <p className="rounded-[var(--radius-ctl)] bg-go-soft px-4 py-3 text-[13.5px]"><span className="font-medium text-go">Profile saved.</span> Last step: check these answers, most already come from your resume, then save to start finding roles.</p>}
      {missing && <p className="rounded-[var(--radius-ctl)] bg-signal-soft px-4 py-3 text-[13.5px] text-signal">Saved. Still needed before forms can be filled without stopping: {missing}.</p>}
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
          <div><h2 className="text-[15px] font-semibold">Resume</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Every application gets two PDFs: your original resume laid out as-is, and one tailored to the posting. Both scores are always shown; this decides which is attached unless you switch on the application.</p></div>
          <label className="text-[13px] sm:max-w-[calc(50%-0.5rem)]"><span className="text-muted">Attach by default</span>
            <select name="resumeDefault" defaultValue={s.resumeDefault} className="field mt-1.5">
              <option value="best">Whichever scores higher for the posting</option>
              <option value="original">Always my original resume</option>
              <option value="tailored">Always the tailored resume</option>
            </select>
          </label>
        </section>
        <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
          <div><h2 className="text-[15px] font-semibold">Notifications</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Resume ready, form filled and submitted events go here.</p></div>
          <label className="text-[13px] sm:max-w-[calc(50%-0.5rem)]"><span className="text-muted">Email for notifications</span><input name="notifyEmail" defaultValue={s.notifyEmail} className="field mt-1.5" /></label>
        </section>
        <div className="sticky bottom-4 flex items-center justify-end gap-3">{saved && !missing && <span className="text-[13px] text-go">Saved.</span>}<SubmitButton pending="Saving" className="btn-primary lift">{from === "profile" ? "Save and find roles" : "Save answers"}</SubmitButton></div>
      </form>

      <section id="saved" className="panel">
        <div className="panel-head">
          <div><h2 className="text-[15px] font-semibold">Saved from your applications</h2><p className="mt-0.5 text-[12.5px] text-muted">Every answer you typed on a form. When another form asks the same question, it is filled from here. Questions about one company, and AI drafts, are never reused.</p></div>
          <span className="meta shrink-0">{banked.length} saved</span>
        </div>
        {banked.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-muted">Nothing yet. Answer a question on any application and it shows up here, ready for the next form.</p>
        ) : (
          <form action={saveBankAction}>
            <ul className="divide-rows">
              {banked.map(([key, e]) => (
                <li key={key} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_1.2fr_auto] md:items-start md:gap-5">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium">{e.label}</div>
                    <div className="meta mt-1">Used for {e.uses.slice(0, 3).map((u) => u.company || "an application").join(", ")}{e.uses.length > 3 ? ` and ${e.uses.length - 3} more` : ""}</div>
                  </div>
                  {e.type === "textarea"
                    ? <textarea name={`bank:${key}`} defaultValue={e.answer} rows={3} className="field text-[13px]" aria-label={e.label} />
                    : <input name={`bank:${key}`} defaultValue={e.answer} className="field mono text-[13px]" aria-label={e.label} />}
                  <button name="delete" value={key} className="btn-quiet h-9 text-[12.5px] text-faint hover:text-danger">Remove</button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3.5">{bankSaved && <span className="text-[13px] text-go">{bankSaved === "removed" ? "Removed." : "Saved. Open applications were updated."}</span>}<SubmitButton pending="Saving" className="btn-ghost">Save saved answers</SubmitButton></div>
          </form>
        )}
      </section>
    </div>
  );
}
