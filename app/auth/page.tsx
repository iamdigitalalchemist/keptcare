import { Suspense } from "react";
import AuthPage from "@/screens/Auth";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
