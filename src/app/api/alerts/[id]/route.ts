import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UpdateBody = {
  active?: boolean;
  threshold?: number;
  dropPercent?: number | null;
  cooldownHours?: number;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (
    typeof body.threshold === "number" &&
    Number.isFinite(body.threshold) &&
    body.threshold > 0
  ) {
    data.threshold = body.threshold;
  }
  if (body.dropPercent !== undefined) {
    if (body.dropPercent === null) {
      data.dropPercent = null;
    } else if (
      typeof body.dropPercent === "number" &&
      Number.isFinite(body.dropPercent) &&
      body.dropPercent > 0 &&
      body.dropPercent <= 100
    ) {
      data.dropPercent = body.dropPercent;
    } else {
      return NextResponse.json(
        { error: "dropPercent must be between 1 and 100 or null" },
        { status: 400 },
      );
    }
  }
  if (
    typeof body.cooldownHours === "number" &&
    Number.isFinite(body.cooldownHours) &&
    body.cooldownHours >= 1
  ) {
    data.cooldownHours = Math.round(body.cooldownHours);
  }

  try {
    const alert = await prisma.alert.updateMany({
      where: { id, userId: session.user.id },
      data,
    });

    if (alert.count === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updated = await prisma.alert.findUniqueOrThrow({
      where: { id },
      include: { product: true },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("[api] alert update failed:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await prisma.alert.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] alert delete failed:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 },
    );
  }
}
