import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
        Sign in
      </h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        Your wishlist and alerts follow your account.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-[var(--muted)]">
        New here?{" "}
        <Link href="/signup" className="font-medium text-[var(--ink)] underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
