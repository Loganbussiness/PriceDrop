import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  // Test database connection
  let dbStatus = 'unknown';
  let dbError = null;
  
  try {
    await prisma.$connect();
    dbStatus = 'connected';
    
    // Try a simple query
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    
    return NextResponse.json({
      hasDbUrl: !!dbUrl,
      dbUrlPrefix: dbUrl?.substring(0, 20) + '...',
      dbUrlLength: dbUrl?.length,
      nodeEnv: process.env.NODE_ENV,
      dbStatus,
      userCount,
      productCount,
    });
  } catch (error) {
    dbStatus = 'failed';
    dbError = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      hasDbUrl: !!dbUrl,
      dbUrlPrefix: dbUrl?.substring(0, 20) + '...',
      dbUrlLength: dbUrl?.length,
      nodeEnv: process.env.NODE_ENV,
      dbStatus,
      dbError,
      needsSchemaCreation: true,
      instructions: "Run: DATABASE_URL='<your-neon-url>' npx prisma db push"
    });
  } finally {
    await prisma.$disconnect();
  }
}