import { Suspense } from "react";
import AcceptInvitePage from "@/screens/AcceptInvite";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitePage />
    </Suspense>
  );
}
