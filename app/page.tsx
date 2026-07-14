import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "KeptCare — The patient CRM that keeps patients coming back",
  description:
    "Automated recalls, SMS & WhatsApp reminders, campaigns, loyalty and analytics for healthcare practices. Start your 14-day free trial — no credit card required.",
};

export default function Page() {
  return <Home />;
}
