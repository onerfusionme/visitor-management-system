import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, VisitorCategory } from '@prisma/client';
import { z } from 'zod';

const createVisitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().nullable(),
  aadhaar: z.string().optional().nullable(),
  voterId: z.string().optional().nullable(),
  village: z.string().min(1, 'Village is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().default('Maharashtra'),
  address: z.string().optional().nullable(),
  category: z.nativeEnum(VisitorCategory).default(VisitorCategory.OTHER),
  age: z.number().min(1).max(120).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  occupation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/visitors - Get all visitors
async function getVisitors(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const village = searchParams.get('village') || '';
    const district = searchParams.get('district') || '';

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { aadhaar: { contains: search } },
        { voterId: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (village) {
      where.village = { contains: village, mode: 'insensitive' };
    }

    if (district) {
      where.district = { contains: district, mode: 'insensitive' };
    }

    const [visitors, total] = await Promise.all([
      db.visitor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              visits: true,
              appointments: true,
              issues: true,
            },
          },
        },
      }),
      db.visitor.count({ where }),
    ]);

    return NextResponse.json({
      visitors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/visitors - Create a new visitor
async function createVisitor(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createVisitorSchema.parse(body);

    // Check if visitor with same phone or aadhaar already exists
    const existingVisitor = await db.visitor.findFirst({
      where: {
        OR: [
          { phone: validatedData.phone },
          ...(validatedData.aadhaar ? [{ aadhaar: validatedData.aadhaar }] : []),
          ...(validatedData.voterId ? [{ voterId: validatedData.voterId }] : []),
        ],
      },
    });

    if (existingVisitor) {
      return NextResponse.json(
        { error: 'Visitor with this phone, Aadhaar, or Voter ID already exists' },
        { status: 409 }
      );
    }

    const visitor = await db.visitor.create({
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      visitor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVisitors);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createVisitor));