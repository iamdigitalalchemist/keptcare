import type { Metadata } from "next";
import Terms from "@/screens/Terms";


export const metadata: Metadata = {
  title: "KeptCare — Terms and Conditions",
  description:
    "legal.",
};

export default function Page() {
  return <Terms />;
}
