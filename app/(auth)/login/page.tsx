"use client";

import Link from "next/link";
import { Form } from "@/components/form";
import { SubmitButton } from "@/components/submit-button";
import { useActionState, useEffect } from "react";
import { login, LoginActionState } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    },
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast.error("Invalid credentials!");
    } else if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12 shadow-soft border border-zinc-200 bg-white">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16 pt-8">
          <h3 className="text-xl font-semibold text-zinc-800">Sign In</h3>
          <p className="text-sm text-gray-500">
            Use your email and password to sign in
          </p>
        </div>
        <Form action={formAction}>
          <SubmitButton>Sign in</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="font-semibold text-brand hover:underline"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </Form>
      </div>
    </div>
  );
}
