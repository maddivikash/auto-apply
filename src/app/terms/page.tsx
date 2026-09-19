import { LegalPage } from "../legal-page";

export const dynamic = "force-static";

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="19 September 2026">
      <p>These terms cover your use of Auto Apply, operated by Vikash Maddi (&quot;we&quot;). By creating an account or connecting an agent to it, you agree to them.</p>

      <h2>What the service does</h2>
      <p>Auto Apply reads a job posting you link, writes a one-page resume from facts in your profile, renders it as a PDF, and works out answers to the application form from your standing answers. It can hand those to your desktop runner or to an AI agent you connect. The service itself never submits an application.</p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Everything in your profile and answers must be true. The resume writer only rearranges and selects from what you give it, so what you give it is what an employer reads.</li>
        <li>Review each tailored resume and the form answers before anything is submitted. You are the applicant; the service is a drafting tool.</li>
        <li>Use the service for your own applications, or those of a person who has asked you to. Do not use it to mass-apply, to apply on behalf of people without their consent, or in ways a job board&apos;s terms forbid.</li>
        <li>Keep your API key and runner token private. Anything done with them counts as done by you.</li>
      </ul>

      <h2>Connected agents</h2>
      <p>You may connect third-party agents (for example Meta Muse, Claude or ChatGPT) through OAuth or an API key. Those agents act on your account under these terms. Their behaviour, including how they fill and submit forms in their own browser, is governed by their providers; we are not responsible for it.</p>

      <h2>Availability and changes</h2>
      <p>The service is provided free during its beta. We may change, pause or discontinue features, and we will give notice before removing access to your data. If paid features are added later, the price will be shown before you are charged.</p>

      <h2>No guarantees</h2>
      <p>The service is provided as is. We do not promise that a resume will match a role, that a form will be filled correctly, or that an application will be received or considered by an employer. Check before you submit.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential losses arising from your use of the service, and our total liability to you is limited to the amount you paid for the service in the previous twelve months, which during the free beta is nothing.</p>

      <h2>Termination</h2>
      <p>You can stop using the service and delete your data at any time. We may suspend accounts that break these terms or abuse the service or a job board.</p>

      <h2>Contact and law</h2>
      <p>Questions go to <a href="mailto:maddi.vikash@gmail.com">maddi.vikash@gmail.com</a>. These terms are governed by the laws of India, with disputes handled by the courts of Gurugram, Haryana.</p>
    </LegalPage>
  );
}
