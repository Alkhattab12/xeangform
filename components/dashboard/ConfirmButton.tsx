"use client";

import { PendingButton } from "@/components/ui/PendingButton";

export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <PendingButton className={className} confirm={message}>
      {children}
    </PendingButton>
  );
}
