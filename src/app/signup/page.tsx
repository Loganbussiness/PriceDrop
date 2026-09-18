import Link from "next/link";
import { RegisterForm } from "@/components/AuthForms";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
        Create an account
      </h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        Anyone you invite can join. Analyses are shared; alerts stay private.
      </p>
      <RegisterForm />
      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--ink)] underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
