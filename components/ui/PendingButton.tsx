"use client";

import { useFormStatus } from "react-dom";
import { useBusyOverlay } from "./LoadingProvider";

/** Tombol submit untuk <form action={serverAction}>: nonaktif saat berjalan + memunculkan overlay jika lambat. */
export function PendingButton({
  className,
  children,
  confirm,
  pendingLabel,
}: {
  className?: string;
  children: React.ReactNode;
  confirm?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  useBusyOverlay(pending);
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={
        confirm
          ? (e) => {
              if (!window.confirm(confirm)) e.preventDefault();
            }
          : undefined
      }
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
