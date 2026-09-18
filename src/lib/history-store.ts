import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "./prisma";
import type { PricePoint } from "./types";

export type StoredProduct = {
  id: string;
  name: string;
  brand: string;
  sourceUrl?: string;
  snapshots: { date: Date; price: number; source: string }[];
};

function toStored(product: {
  id: string;
  name: string;
  brand: string;
  sourceUrl: string | null;
  snapshots: { date: Date; price: number; source: string }[];
}): StoredProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    sourceUrl: product.sourceUrl ?? undefined,
    snapshots: product.snapshots
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

export async function getStoredProduct(
  id: string,
): Promise<StoredProduct | undefined> {
  await maybeImportLegacyJson();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { snapshots: true },
  });
  return product ? toStored(product) : undefined;
}

export async function listStoredProducts(): Promise<StoredProduct[]> {
  await maybeImportLegacyJson();
  const products = await prisma.product.findMany({
    include: { snapshots: true },
    orderBy: { name: "asc" },
  });
  return products.map(toStored);
}

export async function seedHistory(input: {
  id: string;
  name: string;
  brand: string;
  history: PricePoint[];
  sourceUrl?: string;
}) {
  const existing = await prisma.product.findUnique({
    where: { id: input.id },
    include: { snapshots: true },
  });

  if (existing) {
    await prisma.product.update({
      where: { id: input.id },
      data: {
        name: input.name,
        brand: input.brand,
        sourceUrl: input.sourceUrl ?? existing.sourceUrl,
      },
    });
    if (existing.snapshots.length > 0) return;
    if (input.history.length === 0) return;
    await prisma.snapshot.createMany({
      data: input.history.map((h) => ({
        productId: input.id,
        date: h.date,
        price: h.price,
        source: "seed",
      })),
    });
    return;
  }

  await prisma.product.create({
    data: {
      id: input.id,
      name: input.name,
      brand: input.brand,
      sourceUrl: input.sourceUrl,
      snapshots: {
        create: input.history.map((h) => ({
          date: h.date,
          price: h.price,
          source: "seed",
        })),
      },
    },
  });
}

export async function appendSnapshot(input: {
  id: string;
  name: string;
  brand: string;
  price: number;
  sourceUrl?: string;
  source: string;
}): Promise<StoredProduct> {
  const today = new Date();

  await prisma.product.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      name: input.name,
      brand: input.brand,
      sourceUrl: input.sourceUrl,
    },
    update: {
      name: input.name,
      brand: input.brand,
      sourceUrl: input.sourceUrl ?? undefined,
    },
  });

  await prisma.snapshot.upsert({
    where: {
      productId_date: { productId: input.id, date: today },
    },
    create: {
      productId: input.id,
      date: today,
      price: input.price,
      source: input.source,
    },
    update: {
      price: input.price,
      source: input.source,
    },
  });

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: input.id },
    include: { snapshots: true },
  });
  return toStored(product);
}

export function snapshotsToPoints(product: StoredProduct): PricePoint[] {
  return product.snapshots.map((s) => ({ 
    date: s.date, 
    price: s.price 
  }));
}

let importedLegacy = false;

async function maybeImportLegacyJson() {
  if (importedLegacy) return;
  importedLegacy = true;
  const file = join(process.cwd(), "data", "history.json");
  try {
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as {
      products?: Record<
        string,
        {
          id: string;
          name: string;
          brand: string;
          sourceUrl?: string;
          snapshots: { date: string; price: number; source: string }[];
        }
      >;
    };
    const products = Object.values(parsed.products ?? {});
    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          name: product.name,
          brand: product.brand,
          sourceUrl: product.sourceUrl,
        },
        update: {},
      });
      for (const snap of product.snapshots) {
        const snapDate = new Date(snap.date);
        await prisma.snapshot.upsert({
          where: {
            productId_date: { productId: product.id, date: snapDate },
          },
          create: {
            productId: product.id,
            date: snapDate,
            price: snap.price,
            source: snap.source,
          },
          update: {},
        });
      }
    }
  } catch {
    /* no legacy file */
  }
}
