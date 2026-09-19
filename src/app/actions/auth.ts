"use server";

import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerUser(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!validEmail(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "That email already has an account." };

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });

    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Unable to create account due to database connection. Please try again later." };
  }
}

export async function loginUser(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Unable to sign in due to database connection. Please try again later." };
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}

export async function upsertAlert(formData: FormData): Promise<{ error?: string }> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to save an alert." };

  const productId = String(formData.get("productId") ?? "");
  const productName = String(formData.get("productName") ?? "Product");
  const productBrand = String(formData.get("productBrand") ?? "Unknown");
  const threshold = Number(formData.get("threshold"));
  if (!productId || !Number.isFinite(threshold) || threshold <= 0) {
    return { error: "Enter a price above zero." };
  }

  try {
    await prisma.product.upsert({
      where: { id: productId },
      create: { id: productId, name: productName, brand: productBrand },
      update: { name: productName },
    });

    await prisma.alert.upsert({
      where: {
        userId_productId: { userId: session.user.id, productId },
      },
      create: {
        userId: session.user.id,
        productId,
        threshold,
      },
      update: { threshold },
    });

    return {};
  } catch (error) {
    console.error("Alert save error:", error);
    return { error: "Unable to save alert due to database connection. Please try again later." };
  }
}
