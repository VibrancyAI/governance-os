"use client";

import { LoaderIcon } from "@/components/icons";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type={pending ? "button" : "submit"}
      aria-disabled={pending}
      className="relative flex flex-row gap-4 p-2.5 w-full items-center justify-center rounded-md bg-brand text-white hover:bg-brand-700 text-sm transition-all focus:outline-none shadow-soft"
    >
      {children}
      {pending && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}
      <span aria-live="polite" className="sr-only" role="status">
        {pending ? "Loading" : "Submit form"}
      </span>
    </button>
  );
}
