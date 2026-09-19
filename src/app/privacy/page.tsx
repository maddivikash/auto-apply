import { LegalPage } from "../legal-page";

export const dynamic = "force-static";

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="19 September 2026">
      <p>Auto Apply (&quot;the service&quot;) is built and operated by Vikash Maddi. It prepares job applications for you: a resume tailored from your own profile and the answers to an application form&apos;s questions. This page explains what the service stores, why, and how to remove it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account.</strong> Your email address and name, through our sign-in provider Clerk. Clerk&apos;s own policy covers how it handles sign-in data.</li>
        <li><strong>Profile.</strong> The work history, education, projects, skills and achievements you type in or import from a resume. This is the only source of facts the resume writer may use.</li>
        <li><strong>Standing answers.</strong> Contact details and answers to common screening questions (work authorization, relocation, notice period, salary expectation, and an optional gender answer for voluntary demographic questions). You control every value.</li>
        <li><strong>Applications.</strong> The job links you submit, the posting text we read from the job board, the tailored resume and its PDF, your answers to that form&apos;s questions, and status notes. If you use the desktop runner, a screenshot of the filled form.</li>
        <li><strong>Technical.</strong> Server logs with request paths and errors, kept briefly by our hosting provider. No advertising trackers.</li>
      </ul>

      <h2>How we use it</h2>
      <p>Only to run the service for you: to tailor a resume to a posting, to answer its form, to email you when a resume is ready or a form is filled, and to let an agent you connect act on your account. We do not sell data, share it with advertisers, or use it to train models.</p>

      <h2>Who processes it</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the app and stores PDFs and screenshots.</li>
        <li><strong>Turso</strong> stores your profile, answers and applications as encrypted-at-rest records.</li>
        <li><strong>Clerk</strong> handles sign-in and OAuth for connected agents.</li>
        <li><strong>Cloudflare Workers AI</strong> receives the posting text and your profile to write the tailored resume. Inputs are not retained for training under Cloudflare&apos;s terms.</li>
        <li><strong>Resend</strong> delivers notification emails to the address you choose.</li>
        <li><strong>Job boards</strong> (Greenhouse, Lever, Ashby) are read through their public job APIs. We send them nothing; a form is only submitted by you, by your own runner, or by an agent you connected, in a browser.</li>
      </ul>

      <h2>Connected agents</h2>
      <p>If you connect an AI agent such as Meta Muse, Claude or ChatGPT, it can read and change your profile, answers and applications, and download your tailored PDFs through a link that expires after 24 hours. It cannot see your API key or runner token. You can disconnect it or revoke your key at any time from the Connect page; the agent&apos;s provider has its own privacy policy for what it does with what it reads.</p>

      <h2>Retention and deletion</h2>
      <p>Data stays until you delete it. You can delete any application from the app or through a connected agent, which removes its resume and answers. To delete your whole account and everything in it, email <a href="mailto:maddi.vikash@gmail.com">maddi.vikash@gmail.com</a> from your account address; it is done within 7 days.</p>

      <h2>Your rights</h2>
      <p>You can view and export everything the service holds about you from the Profile, Answers and application pages, or through the API. You can correct it at any time. If you are in the EU, UK or another region with data-protection rights, the same email address handles access, correction, deletion and objection requests.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, the date above changes and signed-in users see a notice in the app.</p>
    </LegalPage>
  );
}
