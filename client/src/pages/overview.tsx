import { LegalPageLayout } from "@/components/legal-page-layout";
import { Link } from "wouter";

export default function Overview() {
  return (
    <LegalPageLayout title="Application Overview">
      <p className="text-muted-foreground text-sm" data-testid="text-overview-subtitle">
        Understanding Chansey: what it does, who it serves, and how it uses your data.
      </p>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">What is Chansey?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chansey is an internal operations platform built for Care of Chan, an event production and hospitality company. It centralizes the tools and workflows that Care of Chan&rsquo;s team members use every day to plan, coordinate, and execute events.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Chansey is not a consumer-facing product. Access is limited to authorized Care of Chan workforce members who sign in with their company Google Workspace accounts.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">Key Features</h2>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li><strong>Venue Directory</strong> &mdash; Browse, search, and manage venue information including photos, capacity details, and contact info.</li>
          <li><strong>Deal Pipeline</strong> &mdash; Track client deals from initial inquiry through contract signing, with stage-based workflows and team collaboration.</li>
          <li><strong>Task Management</strong> &mdash; Create, assign, and track tasks across projects to keep event production on schedule.</li>
          <li><strong>Proposals</strong> &mdash; Build and manage event proposals with linked venues, budgets, and supporting documents.</li>
          <li><strong>Contacts &amp; Vendors</strong> &mdash; Maintain a directory of external contacts, vendors, and partners used across events.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">Why Google Sign-In?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chansey uses Google sign-in to authenticate users through Care of Chan&rsquo;s existing Google Workspace. This means team members log in with the same company email and password they already use for Gmail, Calendar, and other Google services. No separate account or password is required.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          During sign-in, Chansey receives basic profile information (your name, email address, and profile picture) from your Google account to identify you within the application.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">Why Google Drive &amp; Sheets Access?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chansey requests access to Google Drive and Google Sheets so that team members can:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Attach and view files (contracts, floor plans, photos) directly within venues, deals, and proposals without leaving the application.</li>
          <li>Link Google Sheets (budgets, run-of-show documents, vendor trackers) to relevant records so the team can access them in context.</li>
          <li>Upload documents from their Google Drive to streamline event planning workflows.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Chansey only accesses files that users explicitly choose to attach or link. It does not scan, index, or access other files in your Google Drive.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">How Your Data Is Used</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Data accessed through Chansey is used solely for the internal business operations described above. Specifically:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Your Google profile information is used only to identify you within the application.</li>
          <li>Google Drive and Sheets data is used only to display, attach, and link files you select.</li>
          <li>Your data is not sold, shared for advertising, or used for any purpose beyond operating the Chansey platform for Care of Chan.</li>
          <li>Your data is not shared with third parties except as required to host and operate the service, or as required by law.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">Related Policies</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          For more details on how your information is handled, please review:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            <Link href="/privacy" className="underline" data-testid="link-overview-privacy">
              Privacy Notice
            </Link>
            {" "}&mdash; Full details on data collection, use, retention, and your rights.
          </li>
          <li>
            <Link href="/terms" className="underline" data-testid="link-overview-terms">
              Terms of Use
            </Link>
            {" "}&mdash; The terms governing your use of the Chansey application.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you have questions about this overview or how Chansey uses your data, please contact:
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Functional Artists<br />
          <a href="mailto:support@functionalartists.ai" className="underline" data-testid="link-overview-email">support@functionalartists.ai</a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
