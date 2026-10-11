"use client";

import { PendingButton } from "@/components/ui/PendingButton";

export function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  return (
    <PendingButton className="nb-btn w-full" pendingLabel={pendingLabel}>
      {children}
    </PendingButton>
  );
}
