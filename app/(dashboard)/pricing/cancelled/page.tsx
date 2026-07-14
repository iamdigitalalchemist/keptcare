"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCancelled() {
  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardContent className="flex flex-col items-center text-center gap-4 py-10">
          <XCircle className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Checkout cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No payment was taken. You can pick a plan whenever you&apos;re ready.
          </p>
          <Button asChild variant="outline">
            <Link href="/pricing">Back to pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
