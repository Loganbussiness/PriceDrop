import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type CreateAlertBody = {
  productId: string;
  productName?: string;
  productBrand?: string;
  sourceUrl?: string;
  threshold: number;
  dropPercent?: number | null;
  cooldownHours?: number;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      productId: a.productId,
      name: a.product.name,
      brand: a.product.brand,
      sourceUrl: a.product.sourceUrl,
      threshold: a.threshold,
      dropPercent: a.dropPercent,
      active: a.active,
      cooldownHours: a.cooldownHours,
      lastNotifiedAt: a.lastNotifiedAt,
      createdAt: a.createdAt,
      currentPrice: a.product.snapshots[0]?.price ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateAlertBody;
  try {
    body = (await request.json()) as CreateAlertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    productId,
    productName = "Product",
    productBrand = "Unknown",
    sourceUrl,
    threshold,
    dropPercent,
    cooldownHours,
  } = body;

  if (!productId || typeof productId !== "string") {
    return NextResponse.json(
      { error: "productId is required" },
      { status: 400 },
    );
  }
  if (
    typeof threshold !== "number" ||
    !Number.isFinite(threshold) ||
    threshold <= 0
  ) {
    return NextResponse.json(
      { error: "threshold must be a positive number" },
      { status: 400 },
    );
  }
  if (
    dropPercent != null &&
    (typeof dropPercent !== "number" ||
      !Number.isFinite(dropPercent) ||
      dropPercent <= 0 ||
      dropPercent > 100)
  ) {
    return NextResponse.json(
      { error: "dropPercent must be between 1 and 100" },
      { status: 400 },
    );
  }

  try {
    await prisma.product.upsert({
      where: { id: productId },
      create: {
        id: productId,
        name: productName,
        brand: productBrand,
        sourceUrl: sourceUrl ?? null,
      },
      update: {
        name: productName,
        brand: productBrand,
        sourceUrl: sourceUrl ?? undefined,
      },
    });

    const alert = await prisma.alert.upsert({
      where: {
        userId_productId: { userId: session.user.id, productId },
      },
      create: {
        userId: session.user.id,
        productId,
        threshold,
        dropPercent: dropPercent ?? null,
        cooldownHours: cooldownHours ?? 12,
        active: true,
      },
      update: {
        threshold,
        dropPercent: dropPercent ?? null,
        cooldownHours: cooldownHours ?? 12,
        active: true,
      },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("[api] alert create failed:", error);
    return NextResponse.json(
      { error: "Failed to save alert" },
      { status: 500 },
    );
  }
}
