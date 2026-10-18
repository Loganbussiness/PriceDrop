import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.FROM_EMAIL || "PriceDrop <pricedropalerts.app@gmail.com>";

export type PriceDropEmailInput = {
  productName: string;
  productBrand: string;
  price: number;
  threshold: number;
  currency?: string;
  url?: string | null;
};

function formatMoney(n: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency === "EUR" ? "€" : ""}${n.toFixed(2)}`;
  }
}

export async function sendPriceDropEmail(
  to: string,
  input: PriceDropEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping email to",
      to,
      "for",
      input.productName,
    );
    return { sent: false, error: "Email service not configured" };
  }

  const subject = `Price drop: ${input.productName} is now ${formatMoney(input.price, input.currency)}`;
  const priceStr = formatMoney(input.price, input.currency);
  const thresholdStr = formatMoney(input.threshold, input.currency);
  const savings = input.threshold - input.price;
  const productUrl = input.url || "https://pricedropalerts.app";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="padding: 24px 0 8px;">
        <p style="font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #6b7280; margin: 0;">PriceDrop</p>
        <h1 style="font-size: 26px; font-weight: 700; margin: 6px 0 0;">🔥 Price drop alert</h1>
      </div>

      <div style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; background: #ffffff;">
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; color: #6b7280; margin: 0 0 4px;">${escapeHtml(input.productBrand)}</p>
        <h2 style="font-size: 22px; font-weight: 650; margin: 0 0 20px;">${escapeHtml(input.productName)}</h2>

        <div style="display: flex; align-items: baseline; gap: 14px; margin-bottom: 20px;">
          <span style="font-size: 36px; font-weight: 700; color: #059669;">${priceStr}</span>
          <span style="font-size: 15px; color: #6b7280;">your alert: <s>${thresholdStr}</s></span>
        </div>

        ${savings > 0 ? `<p style="background: #ecfdf5; border-radius: 10px; padding: 12px 16px; color: #065f46; font-weight: 600; margin: 0 0 20px;">You save ${formatMoney(savings, input.currency)} vs your target.</p>` : ""}

        <a href="${escapeHtml(productUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-weight: 600; font-size: 15px;">View product</a>
      </div>

      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        You're receiving this because you set a price alert on PriceDrop.
        Manage alerts in your account: <a href="https://pricedropalerts.app/alerts" style="color: #6b7280;">pricedropalerts.app/alerts</a>
      </p>
    </div>
  `;

  const text = `Price drop: ${input.productName} (${input.productBrand})

Current price: ${priceStr}
Your alert: ${thresholdStr}${savings > 0 ? ` (saves ${formatMoney(savings, input.currency)} vs target)` : ""}

View: ${productUrl}

— PriceDrop. Manage alerts at https://pricedropalerts.app/alerts`;

  try {
    await resend.emails.send({ from: FROM, to, subject, html, text });
    console.log(`[email] Price drop alert sent to ${to} for ${input.productName}`);
    return { sent: true };
  } catch (error) {
    console.error("[email] Failed to send price drop email:", error);
    return { sent: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendWelcomeEmail(
  to: string,
  name?: string | null,
): Promise<{ sent: boolean }> {
  if (!resend) return { sent: false };

  const subject = "Welcome to PriceDrop — never overpay again";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #6b7280;">PriceDrop</p>
      <h1 style="font-size: 26px; font-weight: 700;">Welcome${name ? `, ${escapeHtml(name)}` : ""}! 👋</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Paste any product link and PriceDrop compares the current price against its history
        and other stores — then tells you plainly: <strong>buy now</strong>, <strong>wait</strong>, or <strong>avoid</strong>.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        <strong>Three things to try:</strong>
      </p>
      <ul style="font-size: 15px; line-height: 1.9; color: #374151;">
        <li>Set a price alert — we email you when a product hits your target</li>
        <li>Check the price history chart before you buy</li>
        <li>Compare stores to find the lowest verified price</li>
      </ul>
      <a href="https://pricedropalerts.app" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-weight: 600;">Start analyzing</a>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { sent: true };
  } catch (error) {
    console.error("[email] Welcome email failed:", error);
    return { sent: false };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
