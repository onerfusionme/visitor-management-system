import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

async function searchVisitors(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({
        visitors: [],
        message: 'Query must be at least 2 characters long',
      });
    }

    const visitors = await db.visitor.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
              { aadhaar: { contains: query } },
              { voterId: { contains: query } },
              { village: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        village: true,
        district: true,
        category: true,
        lastVisit: true,
        visitCount: true,
      },
    });

    return NextResponse.json({
      visitors,
      query,
      count: visitors.length,
    });
  } catch (error) {
    console.error('Search visitors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(searchVisitors);