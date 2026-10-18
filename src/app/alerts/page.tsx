"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { formatEuro } from "@/lib/money";

type AlertItem = {
  id: string;
  productId: string;
  name: string;
  brand: string;
  sourceUrl: string | null;
  threshold: number;
  dropPercent: number | null;
  active: boolean;
  cooldownHours: number;
  lastNotifiedAt: string | null;
  createdAt: string;
  currentPrice: number | null;
};

type AlertListResponse = { alerts: AlertItem[] } | { error: string };

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ email?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sessionRes, alertsRes] = await Promise.all([
        fetch("/api/auth/session").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json() as Promise<AlertListResponse>),
      ]);
      setSession(sessionRes?.user ?? null);
      if ("error" in alertsRes) {
        setError(alertsRes.error);
        setAlerts([]);
      } else {
        setAlerts(alertsRes.alerts);
        setError(null);
      }
    } catch {
      setError("Couldn't load alerts.");
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(alert: AlertItem) {
    setAlerts((prev) =>
      prev?.map((a) => (a.id === alert.id ? { ...a, active: !a.active } : a)) ?? null,
    );
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !alert.active }),
    });
    load();
  }

  async function removeAlert(alertId: string) {
    setAlerts((prev) => prev?.filter((a) => a.id !== alertId) ?? null);
    await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
    load();
  }

  if (session === null && alerts === null) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-[var(--muted)]">
        Loading alerts…
      </div>
    );
  }

  if (!session?.email) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--ink)]">
          Sign in to manage alerts
        </h1>
        <p className="mb-6 text-[var(--muted)]">
          Price alerts are tied to your account so they keep working on any
          device.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-[var(--ink)] px-5 py-2.5 font-medium text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Your price alerts
        </h1>
        <p className="text-[var(--muted)]">
          We check prices every few hours and email you when a product hits
          your target.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[var(--avoid)]/40 bg-[var(--avoid-soft)] px-5 py-4 text-sm text-[var(--ink-soft)]">
          {error}
        </div>
      ) : null}

      {alerts && alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center">
          <p className="mb-1 font-medium text-[var(--ink)]">No alerts yet</p>
          <p className="mb-5 text-sm text-[var(--muted)]">
            Analyze a product and set a target price — we&apos;ll watch it for
            you.
          </p>
          <Link
            href="/"
            className="rounded-full bg-[var(--ink)] px-5 py-2.5 font-medium text-white"
          >
            Analyze a product
          </Link>
        </div>
      ) : null}

      <ul className="space-y-4">
        {alerts?.map((alert) => {
          const belowTarget =
            alert.currentPrice != null && alert.currentPrice <= alert.threshold;
          return (
            <li
              key={alert.id}
              className={`rounded-2xl border bg-white/70 p-5 backdrop-blur ${
                alert.active ? "border-[var(--line)]" : "border-[var(--line)] opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {alert.brand}
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-[var(--ink)]">
                    {alert.sourceUrl ? (
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--accent-deep)]"
                      >
                        {alert.name}
                      </a>
                    ) : (
                      alert.name
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[var(--muted)]">
                    <span>
                      Current:{" "}
                      <span className="font-semibold text-[var(--ink)] tabular-nums">
                        {alert.currentPrice != null
                          ? formatEuro(alert.currentPrice)
                          : "—"}
                      </span>
                    </span>
                    <span>
                      Target:{" "}
                      <span className="font-semibold text-[var(--ink)] tabular-nums">
                        {formatEuro(alert.threshold)}
                      </span>
                    </span>
                    {alert.dropPercent != null ? (
                      <span>or {alert.dropPercent}% drop</span>
                    ) : null}
                    <span>last notified {timeAgo(alert.lastNotifiedAt)}</span>
                  </div>
                  {belowTarget && alert.active ? (
                    <p className="mt-3 text-sm font-semibold text-[var(--buy)]">
                      ✓ At or below your target right now — check it out.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(alert)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      alert.active
                        ? "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent-deep)]"
                        : "bg-[var(--ink)] text-white"
                    }`}
                  >
                    {alert.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAlert(alert.id)}
                    className="rounded-full px-4 py-2 text-sm font-medium text-[var(--avoid)] transition hover:bg-[var(--avoid-soft)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-[var(--muted)]">
        Alerts are checked automatically every 6 hours. Each alert has a 12-hour
        notification cooldown so you never get spammed.
      </p>
    </div>
  );
}
