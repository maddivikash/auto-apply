import { requireUserId } from "@/lib/auth";
import { getProfile, getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { profileAsResume } from "@/lib/resume/default";
import { resumeHtml, TEMPLATES, type TemplateInfo } from "@/lib/resume/templates";
import { SAMPLE_PROFILE, SHOWCASE } from "@/lib/resume/sample";
import { setTemplateAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { TemplateGallery } from "@/components/template-gallery";
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
  const resume = profile ? profileAsResume(profile) : SHOWCASE;
  return (
    <div className="space-y-12">
      <div>
        <AtsBadge />
        <PageHeader
          title="Resume templates that parse cleanly"
          description={`Single column, real text, standard headings. Every template is read correctly by Greenhouse, Lever, Ashby and Workday. ${profile ? "Previews use your own profile." : "Previews use a sample profile until you upload yours."} New applications use your default; any single resume can switch in its editor.`}
        />
      </div>
      <TemplateGallery tiers={TIERS} current={current} action={setTemplateAction}
        items={TEMPLATES.map((t) => ({ id: t.id, name: t.name, tier: t.tier, blurb: t.blurb, font: t.font, html: resumeHtml(resume, who, 1, t.id) }))} />
    </div>
  );
}
