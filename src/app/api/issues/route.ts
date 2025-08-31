import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, IssueCategory, Priority, IssueStatus } from '@prisma/client';
import { z } from 'zod';

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(IssueCategory),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
  visitorId: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  department: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

// GET /api/issues - Get all issues
async function getIssues(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const village = searchParams.get('village');
    const district = searchParams.get('district');
    const assignedTo = searchParams.get('assignedTo');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (priority) {
      where.priority = priority;
    }

    if (village) {
      where.village = { contains: village, mode: 'insensitive' };
    }

    if (district) {
      where.district = { contains: district, mode: 'insensitive' };
    }

    if (assignedTo) {
      where.assignedUserId = assignedTo;
    }

    const [issues, total] = await Promise.all([
      db.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          visitor: {
            select: {
              id: true,
              name: true,
              phone: true,
              village: true,
              district: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
      db.issue.count({ where }),
    ]);

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get issues error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/issues - Create a new issue
async function createIssue(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createIssueSchema.parse(body);

    // If visitorId is provided, verify visitor exists
    if (validatedData.visitorId) {
      const visitor = await db.visitor.findUnique({
        where: { id: validatedData.visitorId },
      });

      if (!visitor) {
        return NextResponse.json(
          { error: 'Visitor not found' },
          { status: 404 }
        );
      }
    }

    // If assignedUserId is provided, verify user exists
    if (validatedData.assignedUserId) {
      const user = await db.user.findUnique({
        where: { id: validatedData.assignedUserId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }

    const issue = await db.issue.create({
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        tags: validatedData.tags,
      },
      include: {
        visitor: {
          select: {
            id: true,
            name: true,
            phone: true,
            village: true,
            district: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      issue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create issue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getIssues);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createIssue));