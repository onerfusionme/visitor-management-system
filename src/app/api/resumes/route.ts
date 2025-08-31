import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createResumeSchema = z.object({
  visitorId: z.string().min(1, 'Visitor ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().min(1, 'File size is required'),
  fileUrl: z.string().url('Invalid file URL').optional().nullable(),
  fileData: z.string().min(1, 'File data is required'),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

// GET /api/resumes - Get all resumes
async function getResumes(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const visitorId = searchParams.get('visitorId');
    const category = searchParams.get('category');

    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (visitorId) {
      where.visitorId = visitorId;
    }

    if (category) {
      where.visitor = {
        category: category,
      };
    }

    const [resumes, total] = await Promise.all([
      db.resume.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          visitor: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              village: true,
              district: true,
              category: true,
              education: true,
              skills: true,
              age: true,
              occupation: true,
            },
          },
        },
      }),
      db.resume.count({ where }),
    ]);

    return NextResponse.json({
      resumes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/resumes - Upload a new resume
async function createResume(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createResumeSchema.parse(body);

    // Verify visitor exists
    const visitor = await db.visitor.findUnique({
      where: { id: validatedData.visitorId },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Check if visitor already has a resume
    const existingResume = await db.resume.findFirst({
      where: {
        visitorId: validatedData.visitorId,
        isActive: true,
      },
    });

    if (existingResume) {
      // Deactivate existing resume
      await db.resume.update({
        where: { id: existingResume.id },
        data: { isActive: false },
      });
    }

    const resume = await db.resume.create({
      data: validatedData,
      include: {
        visitor: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            village: true,
            district: true,
            category: true,
            education: true,
            skills: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      resume,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create resume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getResumes);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createResume));