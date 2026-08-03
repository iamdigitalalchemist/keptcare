"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const toc = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "refund", label: "Refund Policy" },
  { id: "cancellation", label: "Cancellation Policy" },
  { id: "delivery", label: "Delivery Policy" },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* ============ HEADER ============ */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="KeptCare" className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Terms &amp; Policies
        </h1>
        <p className="mt-3 text-muted-foreground">
          KeptCare (Pty) Ltd · Effective Date: 1 August 2026 · Last Updated: 1 August 2026
        </p>

        {/* Table of contents */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-2 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary">
          {/* ============ TERMS AND CONDITIONS ============ */}
          <section id="terms" className="scroll-mt-24">
            <h2>Terms and Conditions</h2>

            <h3>1. About KeptCare</h3>
            <p>
              KeptCare is a cloud-based Customer Relationship Management (CRM) platform built
              exclusively for medical practices. KeptCare is operated by KeptCare (Pty) Ltd, a
              company registered in the Republic of South Africa. By accessing or using the
              KeptCare platform, you agree to be bound by these Terms and Conditions.
            </p>

            <h3>2. Definitions</h3>
            <p>
              <strong>"Service"</strong> means the KeptCare CRM platform and all associated
              features, tools, and automations.
              <br />
              <strong>"Subscriber"</strong> means any individual, practice, or entity that has
              registered for and is paying for access to the Service.
              <br />
              <strong>"Subscription Plan"</strong> means the tier of service selected by the
              Subscriber (Starter, Growth, or Practice Pro).
              <br />
              <strong>"Patient Data"</strong> means any personal information relating to patients
              that is processed through the Service.
              <br />
              <strong>"Agreement"</strong> means these Terms and Conditions together with any
              applicable order form or subscription agreement.
            </p>

            <h3>3. Acceptance of Terms</h3>
            <p>
              By registering for a KeptCare account, clicking "I Agree," or using any part of the
              Service, you confirm that:
            </p>
            <ul>
              <li>You are authorised to enter into this Agreement on behalf of your practice or organisation.</li>
              <li>You have read, understood, and agree to be bound by these Terms and Conditions.</li>
              <li>
                You agree to comply with all applicable South African laws and regulations,
                including the Protection of Personal Information Act 4 of 2013 (POPIA) and the
                Consumer Protection Act 68 of 2008 (CPA).
              </li>
            </ul>

            <h3>4. Subscription and Access</h3>
            <p>4.1 KeptCare offers the following subscription tiers:</p>
            <ul>
              <li>Starter Plan — R1,500 per month (approx. $90 USD)</li>
              <li>Growth Plan — R2,480 per month (approx. $149 USD)</li>
              <li>Practice Pro Plan — R4,140 per month (approx. $249 USD)</li>
            </ul>
            <p>
              4.2 A once-off setup fee of R2,480 (approx. $149 USD) applies to all new
              subscriptions unless expressly waived in writing by KeptCare.
            </p>
            <p>
              4.3 Subscriptions are billed monthly or annually in advance. Annual subscribers
              receive the setup fee waived as a benefit.
            </p>
            <p>
              4.4 USD pricing is indicative. Where billing occurs in ZAR, the rand equivalent at
              the prevailing exchange rate at time of billing applies.
            </p>
            <p>
              4.5 KeptCare reserves the right to amend pricing with 30 days written notice to
              existing Subscribers.
            </p>

            <h3>5. Free Trial</h3>
            <p>5.1 KeptCare offers a 14-day free trial on the Growth Plan for new Subscribers.</p>
            <p>5.2 No credit card or payment method is required to commence a free trial.</p>
            <p>
              5.3 At the end of the trial period, access will be suspended unless the Subscriber
              elects to convert to a paid plan.
            </p>
            <p>
              5.4 KeptCare reserves the right to modify or discontinue the free trial offering at
              any time.
            </p>

            <h3>6. Subscriber Obligations</h3>
            <p>The Subscriber agrees to:</p>
            <ul>
              <li>6.1 Provide accurate and complete information during registration and keep that information updated.</li>
              <li>6.2 Use the Service only for lawful purposes and in accordance with these Terms.</li>
              <li>
                6.3 Ensure that all use of the Service complies with POPIA, including obtaining
                appropriate patient consent for communications sent via the platform.
              </li>
              <li>6.4 Not share login credentials with unauthorised third parties.</li>
              <li>6.5 Not attempt to reverse engineer, copy, resell, or sublicense any part of the Service.</li>
              <li>6.6 Promptly notify KeptCare of any suspected unauthorised access to their account.</li>
            </ul>

            <h3>7. Data and Privacy</h3>
            <p>
              7.1 KeptCare processes personal information in accordance with its Privacy Policy,
              which is incorporated into these Terms by reference.
            </p>
            <p>
              7.2 Patient data processed through the platform remains the property of the
              Subscriber. KeptCare acts as an operator under POPIA and processes patient data only
              on the documented instructions of the Subscriber.
            </p>
            <p>
              7.3 KeptCare stores all data on Africa-region servers (AWS Cape Town or equivalent)
              and does not transfer patient data outside of South Africa without the explicit
              consent of the Subscriber.
            </p>
            <p>
              7.4 KeptCare maintains appropriate technical and organisational measures to protect
              personal information against unauthorised access, loss, or destruction.
            </p>
            <p>
              7.5 In the event of a data breach affecting patient data, KeptCare will notify the
              Subscriber within 72 hours of becoming aware of the breach, in accordance with
              POPIA requirements.
            </p>

            <h3>8. Intellectual Property</h3>
            <p>
              8.1 All intellectual property in the KeptCare platform, including software, design,
              content, and trademarks, remains the exclusive property of KeptCare (Pty) Ltd.
            </p>
            <p>
              8.2 Subscribers are granted a limited, non-exclusive, non-transferable licence to
              use the Service for the duration of their active subscription.
            </p>
            <p>8.3 Subscriber data remains the property of the Subscriber at all times.</p>

            <h3>9. Limitation of Liability</h3>
            <p>
              9.1 KeptCare provides the Service on an "as is" and "as available" basis. While we
              strive for maximum uptime and reliability, we do not guarantee uninterrupted or
              error-free access.
            </p>
            <p>
              9.2 To the maximum extent permitted by applicable law, KeptCare shall not be liable
              for any indirect, incidental, consequential, or special damages arising from the use
              of or inability to use the Service.
            </p>
            <p>
              9.3 KeptCare's total aggregate liability to any Subscriber shall not exceed the
              total subscription fees paid by that Subscriber in the three months immediately
              preceding the event giving rise to the claim.
            </p>
            <p>
              9.4 Nothing in these Terms limits KeptCare's liability for fraud, gross negligence,
              or any liability that cannot be excluded under applicable law.
            </p>

            <h3>10. Warranties and Disclaimers</h3>
            <p>
              10.1 KeptCare warrants that the Service will perform materially in accordance with
              its published documentation during the subscription term.
            </p>
            <p>
              10.2 KeptCare does not warrant that the Service will meet every specific requirement
              of the Subscriber or that it will integrate with all third-party systems without
              configuration.
            </p>
            <p>
              10.3 KeptCare is not a healthcare provider and does not provide medical, clinical,
              or regulatory compliance advice. Subscribers remain solely responsible for the
              clinical and regulatory compliance of their practices.
            </p>

            <h3>11. Amendments to Terms</h3>
            <p>
              KeptCare reserves the right to update these Terms and Conditions at any time.
              Subscribers will be notified of material changes by email at least 30 days before
              changes take effect. Continued use of the Service after that date constitutes
              acceptance of the updated Terms.
            </p>

            <h3>12. Governing Law</h3>
            <p>
              These Terms and Conditions are governed by the laws of the Republic of South Africa.
              Any disputes arising from or related to these Terms shall be subject to the
              jurisdiction of the South African courts.
            </p>

            <h3>13. Contact</h3>
            <p>
              KeptCare (Pty) Ltd
              <br />
              Email: <a href="mailto:legal@keptcare.co.za">legal@keptcare.co.za</a>
              <br />
              Website: <a href="https://www.keptcare.co.za">www.keptcare.co.za</a>
            </p>
          </section>

          {/* ============ REFUND POLICY ============ */}
          <section id="refund" className="scroll-mt-24">
            <h2>Refund Policy</h2>
            <p className="!mt-0 !mb-8 text-sm">Effective Date: 1 August 2025</p>

            <h3>1. Free Trial</h3>
            <p>
              KeptCare offers a 14-day free trial with no payment required. No refund is
              necessary during the trial period as no charge is made.
            </p>

            <h3>2. Monthly Subscriptions</h3>
            <p>
              2.1 Monthly subscription fees are billed in advance and are non-refundable once the
              billing cycle has commenced.
            </p>
            <p>
              2.2 If a Subscriber cancels their monthly subscription, access to the Service will
              continue until the end of the current billing period. No partial refunds will be
              issued for unused days within a billing cycle.
            </p>

            <h3>3. Annual Subscriptions</h3>
            <p>
              3.1 Subscribers on annual plans who cancel within the first 30 days of their initial
              annual subscription are entitled to a pro-rata refund for the unused months
              remaining, less any applicable setup fees and the value of the two free months
              included in the annual plan benefit.
            </p>
            <p>
              3.2 After 30 days, annual subscription fees are non-refundable. Access will continue
              until the end of the annual subscription period.
            </p>

            <h3>4. Setup Fee</h3>
            <p>
              4.1 The once-off setup fee is non-refundable once the onboarding process has
              commenced.
            </p>
            <p>
              4.2 Where the setup fee has been waived as part of a promotion or annual plan, no
              refund of the waived amount applies.
            </p>

            <h3>5. Exceptional Circumstances</h3>
            <p>
              5.1 In exceptional circumstances — such as a verified technical failure on
              KeptCare's part that rendered the Service substantially unusable for an extended
              period — KeptCare may, at its sole discretion, offer a service credit or partial
              refund.
            </p>
            <p>
              5.2 Refund requests on this basis must be submitted in writing to{" "}
              <a href="mailto:billing@keptcare.co.za">billing@keptcare.co.za</a> within 14 days of
              the incident.
            </p>

            <h3>6. Consumer Protection Act</h3>
            <p>
              Nothing in this Refund Policy limits or excludes any rights the Subscriber may have
              under the Consumer Protection Act 68 of 2008 or any other applicable South African
              legislation.
            </p>
          </section>

          {/* ============ CANCELLATION POLICY ============ */}
          <section id="cancellation" className="scroll-mt-24">
            <h2>Cancellation Policy</h2>
            <p className="!mt-0 !mb-8 text-sm">Effective Date: 1 August 2025</p>

            <h3>1. How to Cancel</h3>
            <p>Subscribers may cancel their KeptCare subscription at any time by:</p>
            <ul>
              <li>Logging into their account and selecting Settings → Subscription → Cancel Plan, or</li>
              <li>
                Sending a written cancellation request to{" "}
                <a href="mailto:support@keptcare.co.za">support@keptcare.co.za</a> from the
                registered account email address.
              </li>
            </ul>

            <h3>2. Monthly Subscriptions</h3>
            <p>2.1 Cancellation of a monthly subscription takes effect at the end of the current billing cycle.</p>
            <p>2.2 The Subscriber retains full access to the Service until the end of the paid period.</p>
            <p>2.3 No charges are made after the cancellation date.</p>

            <h3>3. Annual Subscriptions</h3>
            <p>
              3.1 Annual subscriptions may be cancelled at any time. Cancellation takes effect at
              the end of the annual subscription period.
            </p>
            <p>
              3.2 Early cancellation of an annual plan does not entitle the Subscriber to a refund
              of prepaid fees, except as provided in the Refund Policy above.
            </p>

            <h3>4. Data After Cancellation</h3>
            <p>
              4.1 Following cancellation, Subscriber data will be retained on KeptCare's servers
              for 30 days to allow for data export.
            </p>
            <p>
              4.2 After 30 days, all Subscriber data — including patient data — will be
              permanently deleted from KeptCare's systems.
            </p>
            <p>
              4.3 Subscribers are strongly encouraged to export their data before the cancellation
              date. KeptCare provides a full data export function within the platform at no
              additional cost.
            </p>

            <h3>5. Reactivation</h3>
            <p>
              5.1 Subscribers who cancel and wish to reactivate within 30 days may do so without
              losing their data.
            </p>
            <p>
              5.2 Reactivation after 30 days will be treated as a new subscription and a new setup
              fee may apply.
            </p>

            <h3>6. Termination by KeptCare</h3>
            <p>
              6.1 KeptCare reserves the right to suspend or terminate a Subscriber's account
              immediately and without notice in the event of:
            </p>
            <ul>
              <li>Breach of these Terms and Conditions</li>
              <li>Non-payment of subscription fees after reasonable notice</li>
              <li>Use of the Service for unlawful purposes</li>
              <li>Any activity that poses a risk to the security or integrity of the platform or other users' data</li>
            </ul>
            <p>
              6.2 In the event of termination by KeptCare due to non-breach, the Subscriber will
              receive a pro-rata refund of prepaid fees for the unused subscription period.
            </p>
          </section>

          {/* ============ DELIVERY POLICY ============ */}
          <section id="delivery" className="scroll-mt-24">
            <h2>Delivery Policy</h2>
            <p className="!mt-0 !mb-8 text-sm">Effective Date: 1 August 2025</p>

            <h3>1. Nature of Service Delivery</h3>
            <p>
              KeptCare is a software-as-a-service (SaaS) platform. There are no physical goods
              delivered. Service delivery is entirely digital and conducted via the KeptCare web
              platform and mobile application.
            </p>

            <h3>2. Account Activation</h3>
            <p>
              2.1 Upon successful registration and payment (or commencement of a free trial),
              Subscribers will receive access to the KeptCare platform within 24 hours of account
              confirmation.
            </p>
            <p>
              2.2 Login credentials and platform access details will be delivered to the
              registered email address provided at signup.
            </p>
            <p>2.3 KeptCare will send a confirmation email containing:</p>
            <ul>
              <li>Account login details</li>
              <li>A link to the onboarding guide</li>
              <li>Contact details for the dedicated onboarding team</li>
            </ul>

            <h3>3. Onboarding</h3>
            <p>3.1 All paid plans include a dedicated onboarding session conducted via video call.</p>
            <p>3.2 Onboarding sessions are scheduled within 48 hours of the first payment being received.</p>
            <p>
              3.3 The onboarding session covers platform setup, automation configuration, and
              staff training tailored to the Subscriber's practice type and specialty.
            </p>

            <h3>4. Platform Availability</h3>
            <p>4.1 KeptCare targets a platform uptime of 99.5% measured on a monthly basis.</p>
            <p>
              4.2 Scheduled maintenance will be communicated to Subscribers at least 24 hours in
              advance via email and in-platform notification.
            </p>
            <p>
              4.3 KeptCare's automated sequences and patient communication features operate on
              KeptCare's servers and will continue to function independently of the Subscriber's
              local internet connectivity or power availability.
            </p>

            <h3>5. Support</h3>
            <p>5.1 Technical support is available to all paid Subscribers via:</p>
            <ul>
              <li>Email: <a href="mailto:support@keptcare.co.za">support@keptcare.co.za</a></li>
              <li>In-platform live chat during business hours (Monday to Friday, 08:00–17:00 SAST)</li>
            </ul>
            <p>
              5.2 Practice Pro plan Subscribers receive priority support with a guaranteed
              response time of 4 business hours.
            </p>

            <h3>6. Geographic Availability</h3>
            <p>
              6.1 KeptCare is available to medical practices across South Africa and East Africa
              including Kenya, Tanzania, and Uganda.
            </p>
            <p>
              6.2 Subscribers outside South Africa may be subject to different billing currencies
              and localised onboarding support. Contact{" "}
              <a href="mailto:sales@keptcare.co.za">sales@keptcare.co.za</a> for regional pricing.
            </p>
          </section>

          <p className="mt-16 text-sm border-t border-border pt-8">
            These policies should be read together with the KeptCare Terms and Conditions and
            Privacy Policy. For any queries contact{" "}
            <a href="mailto:legal@keptcare.co.za">legal@keptcare.co.za</a>.
          </p>
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} KeptCare. Patient CRM for healthcare practices.
        </div>
      </footer>
    </div>
  );
}
