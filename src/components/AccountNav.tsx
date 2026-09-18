import Link from "next/link";
import { auth } from "@/auth";
import { logoutUser } from "@/app/actions/auth";

export async function AccountNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="text-[var(--muted)] hover:text-[var(--ink)]">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-[var(--ink)] px-3 py-1.5 font-medium text-white"
        >
          Join
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/wishlist" className="text-[var(--muted)] hover:text-[var(--ink)]">
        Wishlist
      </Link>
      <span className="hidden max-w-[10rem] truncate text-[var(--muted)] sm:inline">
        {session.user.email}
      </span>
      <form action={logoutUser}>
        <button type="submit" className="text-[var(--muted)] hover:text-[var(--ink)]">
          Sign out
        </button>
      </form>
    </div>
  );
}
