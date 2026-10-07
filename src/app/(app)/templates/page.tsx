import { requireUserId } from "@/lib/auth";
import { getProfile, getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { profileAsResume } from "@/lib/resume/default";
import { resumeHtml, TEMPLATES, type TemplateInfo } from "@/lib/resume/templates";
import { SAMPLE_PROFILE } from "@/lib/resume/sample";
import { setTemplateAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { ResumeFrame } from "@/components/resume-frame";
import { UseTemplateButton } from "@/components/template-picker";
import { AtsBadge } from "@/components/ats-badge";

export const dynamic = "force-dynamic";

const TIERS: { tier: TemplateInfo["tier"]; title: string; body: string }[] = [
  { tier: "S", title: "Best practice, no compromises", body: "Single column, standard headings, plain text. Nothing a recruiter or an applicant tracking system has to work around." },
  { tier: "A", title: "Close to best practice", body: "One small departure, like an accent colour or a different header. Still one column of real text that parses cleanly." }
];

export default async function TemplatesPage() {
  const uid = await requireUserId();
  const [profile, settings] = await Promise.all([getProfile(uid), getSettings(uid)]);
  const current = Settings.parse(settings ?? {}).resumeTemplate;
  const who = profile ?? SAMPLE_PROFILE;
  const resume = profileAsResume(who);
  return (
    <div className="space-y-12">
      <div>
        <AtsBadge />
        <PageHeader
          title="Resume templates that parse cleanly"
          description={`Single column, real text, standard headings. Every template is read correctly by Greenhouse, Lever, Ashby and Workday. ${profile ? "Previews use your own profile." : "Previews use a sample profile until you upload yours."} New applications use your default; any single resume can switch in its editor.`}
        />
      </div>
      {TIERS.map(({ tier, title, body }) => (
        <section key={tier}>
          <div className="flex flex-col gap-3 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="pill bg-surface text-fg shadow-[var(--ring)]"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white ${tier === "S" ? "bg-go" : "bg-accent"}`}>{tier}</span>{tier} tier</span>
              <h2 className="mt-3 text-[26px] font-medium tracking-[-0.03em]">{title}</h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES.filter((t) => t.tier === tier).map((t) => (
              <li key={t.id} className={`group rounded-[18px] p-3 transition-shadow ${t.id === current ? "bg-accent-soft shadow-[0_0_0_2px_var(--accent)]" : "bg-surface-2 hover:shadow-[var(--ring)]"}`}>
                <div className="overflow-hidden rounded-[8px] shadow-[0_1px_2px_rgba(7,26,49,0.08),0_12px_30px_-18px_rgba(7,26,49,0.4)]">
                  <ResumeFrame html={resumeHtml(resume, who, 1, t.id)} title={`${t.name} template preview`} />
                </div>
                <div className="px-1 pb-1 pt-4">
                  <div className="flex items-baseline justify-between gap-3"><h3 className="text-[16px] font-medium">{t.name}</h3><span className="meta uppercase">{t.font}</span></div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.blurb}</p>
                  <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[12.5px] text-go">✓ Parsable by all major ATS</span><UseTemplateButton id={t.id} current={t.id === current} action={setTemplateAction} /></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
