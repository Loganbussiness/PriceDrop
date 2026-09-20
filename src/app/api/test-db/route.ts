import { NextResponse } from 'next/server';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  return NextResponse.json({
    hasDbUrl: !!dbUrl,
    dbUrlPrefix: dbUrl?.substring(0, 20) + '...',
    dbUrlLength: dbUrl?.length,
    nodeEnv: process.env.NODE_ENV,
  });
}