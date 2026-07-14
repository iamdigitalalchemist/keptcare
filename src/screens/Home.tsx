import Link from "next/link";
import {
  Users,
  Bot,
  MessageSquare,
  Megaphone,
  Bell,
  Star,
  Filter,
  BarChart3,
  CalendarCheck,
  Smartphone,
  Mail,
  Check,
  Sparkles,
  ShieldCheck,
  Upload,
  Zap,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/home/Reveal";
import { AuthCta, NavSignIn, PlanCta } from "@/components/home/HomeCtas";

// Server component: all copy and layout render as static HTML. The only client
// JS on this page is the Reveal scroll wrapper and the auth-aware CTAs.

const features = [
  {
    icon: Users,
    title: "Patient CRM",
    description:
      "Every patient's history, contact details, consent and visit patterns in one clean record — with CSV import to get started in minutes.",
  },
  {
    icon: CalendarCheck,
    title: "Appointments",
    description:
      "Track upcoming visits, spot no-shows early, and see exactly who is due back this week at a glance.",
  },
  {
    icon: Filter,
    title: "Smart segments",
    description:
      "Slice your patient base by last visit, tags, revenue or consent — then target each group with the right message.",
  },
  {
    icon: Bot,
    title: "Automations",
    description:
      "Set-and-forget recall rules: no visit in 6 months, missed appointment, check-up due — KeptCare reaches out automatically.",
  },
  {
    icon: Megaphone,
    title: "Campaigns",
    description:
      "One-off pushes to a whole segment — reactivations, seasonal check-ups, announcements — with open and delivery tracking.",
  },
  {
    icon: MessageSquare,
    title: "Message templates",
    description:
      "Reusable SMS, email and WhatsApp templates with dynamic variables like patient name and appointment date.",
  },
  {
    icon: Star,
    title: "Loyalty",
    description:
      "Reward repeat visits with points and perks that give patients one more reason to choose you again.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Retention, revenue and engagement trends that show what's working — and which patients are slipping away.",
  },
  {
    icon: Bell,
    title: "Alerts",
    description:
      "Get nudged when a high-value patient goes quiet or a campaign needs attention, before it costs you a booking.",
  },
];

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Import your patients",
    description:
      "Upload a CSV or add patients as they visit. KeptCare organises records, consent and visit history automatically.",
  },
  {
    icon: Zap,
    step: "02",
    title: "Switch on automations",
    description:
      "Pick your recall rules and message templates. Reminders and follow-ups go out on schedule — no admin required.",
  },
  {
    icon: HeartPulse,
    step: "03",
    title: "Watch patients come back",
    description:
      "Track rebookings, delivery and revenue in the dashboard while your front desk focuses on the people in the room.",
  },
];

const plans = [
  {
    name: "Starter",
    price: 29,
    description: "For solo practitioners getting started",
    features: [
      "Up to 200 patients",
      "2 automation rules",
      "Email reminders only",
      "Basic reporting",
      "1 user seat",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: 79,
    description: "For growing practices",
    features: [
      "Up to 1,000 patients",
      "10 automation rules",
      "SMS + Email reminders",
      "Campaign messaging",
      "Advanced reporting",
      "3 user seats",
      "Message templates",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: 149,
    description: "For established multi-location practices",
    features: [
      "Unlimited patients",
      "Unlimited automation rules",
      "SMS + Email + WhatsApp",
      "Campaign messaging",
      "Full analytics suite",
      "Unlimited user seats",
      "Custom templates",
      "API access",
      "Priority support",
    ],
    popular: false,
  },
];

const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "Every new practice gets 14 days with full access — no credit card required. When the trial ends, pick the plan that fits and keep going. Your data stays exactly where you left it.",
  },
  {
    question: "Which messaging channels are supported?",
    answer:
      "SMS, email and WhatsApp, depending on your plan. SMS is delivered through Twilio with per-message delivery tracking, and every send is logged against the patient's record.",
  },
  {
    question: "Can I import my existing patient list?",
    answer:
      "Yes — upload a CSV and KeptCare maps names, contact details, visit dates and tags. Most practices are fully set up in under half an hour.",
  },
  {
    question: "What about patient consent and privacy?",
    answer:
      "Consent is tracked per patient, per channel — KeptCare will not message a patient who hasn't opted in. Your data is stored securely and access is controlled with per-user roles and permissions.",
  },
  {
    question: "Can my whole team use it?",
    answer:
      "Yes. Invite teammates by email and control what each person can see and do with fine-grained roles — front desk, practitioners, and admins all get the right level of access.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Anytime, in one click, from the billing page. There are no lock-in contracts — you keep access until the end of your billing period.",
  },
];

const highlights = [
  { value: "3", label: "messaging channels" },
  { value: "14 days", label: "free trial, no card" },
  { value: "<30 min", label: "typical setup time" },
  { value: "Unlimited", label: "recall automations on Pro" },
];

const channels = [
  {
    icon: Smartphone,
    name: "SMS",
    color: "text-info bg-info/10",
    blurb:
      "Twilio-powered texts with real-time delivery status — the channel with the highest open rates in healthcare.",
    sample: "Hi {{patient_name}}, your check-up with {{practice_name}} is due. Reply YES to book.",
  },
  {
    icon: Mail,
    name: "Email",
    color: "text-primary bg-primary/10",
    blurb:
      "Rich reminders, recall letters and newsletters with open tracking, from your practice's name.",
    sample: "Subject: Time for your 6-month check-up, {{first_name}}",
  },
  {
    icon: MessageSquare,
    name: "WhatsApp",
    color: "text-success bg-success/10",
    blurb:
      "Meet patients in the app they use all day — perfect for confirmations and two-way conversations.",
    sample: "Your appointment is confirmed for {{appointment_date}} ✅",
  },
];

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">KC</span>
      </div>
      <span className={`font-semibold text-lg tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
        KeptCare
      </span>
    </Link>
  );
}

// A stylised dashboard preview built from real UI pieces — no screenshots needed.
function ProductMockup() {
  const bars = [42, 58, 45, 70, 62, 84, 76, 92];
  return (
    <div className="relative">
      {/* Glow behind the mockup */}
      <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full" aria-hidden />

      <div
        className="animate-home-fade-up relative rounded-2xl border border-white/10 bg-[hsl(210,28%,10%)]/90 backdrop-blur shadow-2xl overflow-hidden"
        style={{ animationDelay: "200ms", animationDuration: "0.7s" }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-[11px] text-white/40 font-mono">keptcare · dashboard</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active patients", value: "1,284", delta: "+6.2%" },
              { label: "Recalls sent", value: "312", delta: "+18%" },
              { label: "Show-up rate", value: "94%", delta: "+3.1%" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                <p className="text-[11px] text-white/45">{s.label}</p>
                <p className="text-xl font-semibold text-white mt-1">{s.value}</p>
                <p className="text-[11px] text-[hsl(174,62%,55%)] mt-0.5">{s.delta}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/60 font-medium">Rebookings this quarter</p>
              <span className="text-[11px] text-white/35">Last 8 weeks</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={`animate-home-grow flex-1 rounded-t-md ${
                    i === bars.length - 1 ? "bg-[hsl(174,62%,50%)]" : "bg-[hsl(174,62%,50%)]/35"
                  }`}
                  style={{ height: `${h}%`, animationDelay: `${500 + i * 70}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Automation row */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[hsl(174,62%,50%)]/15 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-[hsl(174,62%,55%)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">6-month check-up recall</p>
              <p className="text-[11px] text-white/40 truncate">SMS · 38 patients matched · runs daily</p>
            </div>
            <span className="ml-auto text-[10px] font-medium text-[hsl(152,60%,55%)] bg-[hsl(152,60%,42%)]/15 rounded-full px-2 py-0.5 flex-shrink-0">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Floating SMS bubble */}
      <div
        className="animate-home-fade-up absolute -right-4 sm:-right-10 -bottom-8 w-60 rounded-2xl bg-white shadow-2xl border border-border p-3.5"
        style={{ animationDelay: "900ms" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-info/15 flex items-center justify-center">
            <Smartphone className="h-3 w-3 text-info" />
          </div>
          <p className="text-[11px] font-medium text-foreground">SMS · delivered</p>
          <Check className="h-3 w-3 text-success ml-auto" />
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Hi Thabo, it&apos;s been 6 months since your last visit to Smile Dental. Reply YES and
          we&apos;ll book you in this week.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ============ NAV ============ */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[hsl(210,35%,7%)]/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo dark />
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <NavSignIn />
            <AuthCta className="shadow-lg shadow-primary/25" />
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-[hsl(210,35%,7%)] pt-32 pb-24 sm:pb-32">
        {/* Backdrop: teal glows + grid */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 45% at 50% -5%, hsl(174 62% 40% / 0.25), transparent 70%), radial-gradient(ellipse 40% 35% at 85% 60%, hsl(174 62% 40% / 0.10), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(210 20% 98% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(210 20% 98% / 0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-home-fade-up">
              <Badge
                variant="outline"
                className="border-white/15 bg-white/5 text-white/75 gap-1.5 px-3 py-1 rounded-full"
              >
                <Sparkles className="h-3 w-3 text-[hsl(174,62%,55%)]" />
                The patient CRM for modern practices
              </Badge>
            </div>

            <h1
              className="animate-home-fade-up mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08]"
              style={{ animationDelay: "80ms" }}
            >
              Keep every patient{" "}
              <span className="bg-gradient-to-r from-[hsl(174,62%,55%)] to-[hsl(174,80%,70%)] bg-clip-text text-transparent">
                coming back
              </span>
            </h1>

            <p
              className="animate-home-fade-up mt-5 text-lg text-white/60 leading-relaxed"
              style={{ animationDelay: "160ms" }}
            >
              KeptCare turns your patient list into repeat bookings — automated recalls, SMS &
              WhatsApp reminders, campaigns and loyalty, all from one dashboard built for
              healthcare practices.
            </p>

            <div
              className="animate-home-fade-up mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <AuthCta size="lg" className="w-full sm:w-auto text-base px-7 shadow-xl shadow-primary/30" withArrow />
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base px-7 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#features">Explore features</a>
              </Button>
            </div>

            <p
              className="animate-home-fade-up mt-4 text-xs text-white/40"
              style={{ animationDelay: "340ms" }}
            >
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>

          <div className="mt-16 sm:mt-20 max-w-3xl mx-auto">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* ============ HIGHLIGHTS STRIP ============ */}
      <section className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {highlights.map((h) => (
            <Reveal key={h.label} className="text-center">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{h.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{h.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="secondary" className="rounded-full px-3">Everything in one place</Badge>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              Built for the way practices actually work
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From first visit to lifelong patient — every tool you need to fill the diary,
              without the spreadsheet juggling.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 80}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/40"
              >
                <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CHANNELS ============ */}
      <section className="py-24 bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="secondary" className="rounded-full px-3">Reach patients anywhere</Badge>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              SMS, email and WhatsApp — one send button
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Write the message once with dynamic variables; KeptCare delivers it on the channel
              each patient actually reads, and logs every delivery.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {channels.map((c, i) => (
              <Reveal key={c.name} delay={i * 100} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.color}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.blurb}</p>
                <div className="mt-4 rounded-lg bg-muted p-3 text-xs font-mono text-muted-foreground leading-relaxed">
                  {c.sample}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="py-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="secondary" className="rounded-full px-3">Up and running today</Badge>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              Three steps to a fuller diary
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <Reveal key={s.step} delay={i * 120} className="relative rounded-2xl border border-border bg-card p-7 shadow-sm">
                <span className="absolute top-6 right-6 text-4xl font-bold text-muted-foreground/15">
                  {s.step}
                </span>
                <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/25">
                  <s.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-24 bg-muted/50 border-y border-border scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="secondary" className="rounded-full px-3">Simple pricing</Badge>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              Plans that grow with your practice
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Start free for 14 days. Upgrade, downgrade or cancel whenever you like.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <Reveal
                key={plan.name}
                delay={i * 100}
                className={`relative rounded-2xl border bg-card p-7 shadow-sm ${
                  plan.popular ? "border-primary shadow-xl shadow-primary/10 md:-mt-3 md:mb-3" : "border-border"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 shadow">
                    Most popular
                  </Badge>
                )}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">£{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <PlanCta popular={plan.popular} />
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-24 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-12">
            <Badge variant="secondary" className="rounded-full px-3">FAQ</Badge>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              Questions, answered
            </h2>
          </Reveal>

          <Reveal>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden bg-[hsl(210,35%,7%)] py-24">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 55% 60% at 50% 100%, hsl(174 62% 40% / 0.22), transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Your next booking is already in your patient list
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Stop losing patients to silence. Start your free trial and send your first automated
              recall today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <AuthCta size="lg" className="w-full sm:w-auto text-base px-8 shadow-xl shadow-primary/30" withArrow />
            </div>
            <p className="mt-4 text-xs text-white/40">14-day free trial · No credit card required</p>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[hsl(210,35%,6%)] border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo dark />
            <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/50">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link href="/auth" className="hover:text-white transition-colors">Sign in</Link>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-xs text-white/35">
            © {new Date().getFullYear()} KeptCare. Patient CRM for healthcare practices.
          </div>
        </div>
      </footer>
    </div>
  );
}
