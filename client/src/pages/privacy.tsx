import { LegalPageLayout } from "@/components/legal-page-layout";

export default function Privacy() {
  return (
    <LegalPageLayout title="Employee Privacy Notice for Chansey">
      <p className="text-muted-foreground text-sm" data-testid="text-effective-date">Effective Date: April 1, 2026</p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        This Employee Privacy Notice explains how personal information is collected, used, disclosed, retained, and otherwise processed in connection with authorized use of the Chansey application, website, and related services (the &ldquo;App&rdquo;) by workforce members of Care of Chan (&ldquo;Customer&rdquo;).
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        This Notice applies only to personal information processed through the App in connection with Care of Chan&rsquo;s internal business operations.
      </p>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">1. Who This Notice Applies To</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">This Notice applies to authorized users of the App, including:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>employees,</li>
          <li>contractors,</li>
          <li>temporary staff,</li>
          <li>managers,</li>
          <li>administrators,</li>
          <li>and other workforce members of Care of Chan who are granted access to the App.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">2. Roles of Care of Chan and Functional Artists</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Care of Chan generally determines the business purposes for which the App is used and what workforce data is entered into or managed through the App.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Functional Artists provides and supports the App on behalf of Care of Chan and may process App-related information in order to host, secure, maintain, support, analyze, and improve the service as permitted by contract and applicable law.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          For certain limited categories of information, such as support communications, operational service records, and certain security and system logs, Functional Artists may process information for its own operational purposes related to providing and protecting the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">3. Categories of Personal Information Collected</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Depending on how Care of Chan configures and uses the App, the App may collect, receive, generate, or store the following categories of personal information:
        </p>

        <h3 className="text-base font-medium mt-4 mb-1">Identity and employment-related information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>name</li>
          <li>Care of Chan work email address</li>
          <li>username</li>
          <li>employee or workforce identifier</li>
          <li>department</li>
          <li>title or role</li>
          <li>manager or reporting relationship</li>
          <li>business contact information</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Authentication and access information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>single sign-on identifiers</li>
          <li>login records</li>
          <li>account status</li>
          <li>permission and role settings</li>
          <li>password reset or access recovery records, where applicable</li>
          <li>multi-factor authentication status, where applicable</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Device, network, and technical information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>IP address</li>
          <li>browser type and version</li>
          <li>device identifiers</li>
          <li>operating system</li>
          <li>session timestamps</li>
          <li>log files</li>
          <li>network and security event data</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Usage and activity information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>pages, screens, or records accessed</li>
          <li>time and date of actions</li>
          <li>clicks, submissions, edits, approvals, comments, messages, exports, uploads, and downloads</li>
          <li>audit trail records</li>
          <li>administrator actions taken on an account or record</li>
          <li>user-level activity reports and exports</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Content and business records</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>information entered into forms and workflows</li>
          <li>messages and comments</li>
          <li>files and attachments</li>
          <li>photo uploads</li>
          <li>video uploads</li>
          <li>notes and other records created in the course of business use</li>
          <li>reports and dashboards associated with a user or team</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Analytics information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>basic web analytics relating to App usage, navigation patterns, performance, reliability, and feature engagement</li>
        </ul>

        <h3 className="text-base font-medium mt-4 mb-1">Support and communications information</h3>
        <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
          <li>support requests</li>
          <li>troubleshooting data</li>
          <li>communications regarding incidents, bugs, access issues, or feature requests</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">4. Sensitive Personal Information</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chansey is not intended to collect or process sensitive personal information. Users should not submit sensitive personal information through the App unless expressly instructed and authorized by Care of Chan and Functional Artists.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">5. Sources of Personal Information</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Personal information processed through the App may be obtained from:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>the individual user directly;</li>
          <li>Care of Chan administrators or managers;</li>
          <li>Care of Chan systems integrated with the App;</li>
          <li>Google Workspace and related identity or single sign-on services used by Care of Chan;</li>
          <li>automated logging, analytics, and monitoring technologies associated with the App.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">6. Purposes of Processing</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Personal information may be processed for the following purposes:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>providing access to the App;</li>
          <li>verifying eligibility to use the App through a Care of Chan-managed email account;</li>
          <li>authenticating users and managing permissions;</li>
          <li>operating Care of Chan workflows and internal business processes;</li>
          <li>enabling messages, comments, and collaboration features;</li>
          <li>storing and managing business records and uploaded content;</li>
          <li>maintaining audit trails and administrative records;</li>
          <li>securing the App and detecting unauthorized activity;</li>
          <li>troubleshooting, support, and maintenance;</li>
          <li>auditing usage, changes, and administrative activity;</li>
          <li>enforcing policies, investigating misuse, or responding to incidents;</li>
          <li>analyzing service usage through basic web analytics;</li>
          <li>improving reliability, performance, and functionality of the App;</li>
          <li>complying with contractual, legal, regulatory, and recordkeeping requirements.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">7. Monitoring, Logging, Analytics, and Administrative Oversight</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Because the App is an employer-provided business system, use of the App may be monitored, logged, reviewed, retained, and exported by Care of Chan and authorized service providers for legitimate business purposes.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">This may include:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>login and logout events;</li>
          <li>account access history;</li>
          <li>records viewed or modified;</li>
          <li>workflow actions taken;</li>
          <li>messages and comments;</li>
          <li>uploads, downloads, and exports;</li>
          <li>photo and video upload activity;</li>
          <li>device, browser, and connection metadata;</li>
          <li>administrator actions;</li>
          <li>security alerts and investigation records;</li>
          <li>basic web analytics associated with App use.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Care of Chan administrators may have the ability to export user-level activity and related business records from the App.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Your use of the App indicates your acknowledgment that Chansey is a business system subject to monitoring, logging, analytics, export, and administrative oversight consistent with applicable law and company policy.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">8. Disclosures of Personal Information</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Personal information processed through the App may be disclosed to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Care of Chan personnel, including authorized administrators, managers, HR, compliance, legal, IT, and information security personnel;</li>
          <li>service providers and vendors that support hosting, infrastructure, authentication, security, analytics, maintenance, storage, communications, and support for the App;</li>
          <li>professional advisors such as auditors, insurers, and legal counsel, where appropriate;</li>
          <li>governmental, regulatory, or law enforcement authorities where required by law, legal process, or valid governmental request;</li>
          <li>successors or transaction parties in connection with a merger, acquisition, financing, or sale of assets, where permitted by law and contract.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">9. Sale or Advertising Use</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Functional Artists does not sell personal information collected through the App.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Functional Artists does not use personal information collected through the App for cross-context behavioral advertising.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">10. Retention</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Personal information processed through the App is retained for the duration of the service relationship and for 3 years after termination of service, unless a longer period is required by law, legal process, dispute resolution needs, security needs, or contractual obligations.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">This retention approach applies generally to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>account profile data;</li>
          <li>usage logs;</li>
          <li>audit logs;</li>
          <li>analytics records;</li>
          <li>support records;</li>
          <li>messages, comments, uploads, files, photos, videos, and other business records stored in the App.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          After the applicable retention period, information may be deleted, de-identified, or otherwise disposed of in accordance with Functional Artists&rsquo; and Care of Chan&rsquo;s retention and deletion practices.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">11. Security</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Reasonable administrative, technical, and organizational safeguards are used to protect personal information processed through the App. These measures may include:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>role-based access controls;</li>
          <li>authentication controls;</li>
          <li>single sign-on integration;</li>
          <li>multi-factor authentication support, where enabled;</li>
          <li>encryption in transit and, where applicable, at rest;</li>
          <li>logging and audit trails;</li>
          <li>backup and recovery processes;</li>
          <li>incident response procedures;</li>
          <li>vendor oversight and confidentiality obligations.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          No system can be guaranteed to be completely secure, and users should follow Care of Chan&rsquo;s security practices when using the App.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">12. California Notice</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you are a California resident, California law may provide you with certain rights regarding personal information, subject to exceptions and limitations.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">This Notice is intended to provide information regarding:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>the categories of personal information collected;</li>
          <li>the purposes for which those categories are used;</li>
          <li>the fact that Chansey is not intended to collect sensitive personal information;</li>
          <li>the retention period for personal information, which is generally the duration of service plus 3 years after termination of service.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Requests relating to workforce privacy rights should generally be directed first to Care of Chan using Care of Chan&rsquo;s designated privacy, HR, or management contact, unless Care of Chan instructs otherwise.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">13. Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Questions about this Notice or the handling of personal information in connection with the App may be directed to:
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Functional Artists<br />
          <a href="mailto:support@functionalartists.ai" className="underline">support@functionalartists.ai</a>
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mt-2">
          Care of Chan may also provide separate internal contacts or policies for privacy, HR, IT, or compliance questions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-6 mb-2">14. Changes to This Notice</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This Notice may be updated from time to time to reflect changes in the App, legal requirements, operational practices, or Care of Chan&rsquo;s implementation. The current version will be made available through the App or another appropriate internal channel.
        </p>
      </section>
    </LegalPageLayout>
  );
}
