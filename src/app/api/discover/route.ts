import { NextRequest, NextResponse } from 'next/server';
import { discoverProducts } from '@/lib/ai-discovery';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const budget = searchParams.get('budget');
  const category = searchParams.get('category');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const result = await discoverProducts(
    query,
    budget ? parseFloat(budget) : undefined,
    category || undefined
  );

  return NextResponse.json(result);
}
