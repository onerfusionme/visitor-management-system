import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/resumes/[id] - Get a specific resume
async function getResume(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const resume = await db.resume.findUnique({
      where: { id },
      include: {
        visitor: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            village: true,
            district: true,
            state: true,
            category: true,
            education: true,
            skills: true,
            age: true,
            gender: true,
            occupation: true,
            visitCount: true,
            lastVisit: true,
            visits: {
              select: {
                id: true,
                checkInTime: true,
                checkOutTime: true,
                status: true,
                purpose: true,
                notes: true,
                satisfaction: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
              orderBy: { checkInTime: 'desc' },
            },
            appointments: {
              select: {
                id: true,
                title: true,
                scheduledDate: true,
                startTime: true,
                status: true,
                priority: true,
                notes: true,
              },
              orderBy: { scheduledDate: 'desc' },
            },
            issues: {
              select: {
                id: true,
                title: true,
                category: true,
                priority: true,
                status: true,
                createdAt: true,
                resolution: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ resume });
  } catch (error) {
    console.error('Get resume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/resumes/[id] - Update a resume
async function updateResume(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();

    const resume = await db.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const updatedResume = await db.resume.update({
      where: { id },
      data: body,
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
      resume: updatedResume,
    });
  } catch (error) {
    console.error('Update resume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/resumes/[id] - Delete a resume (soft delete)
async function deleteResume(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const resume = await db.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await db.resume.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getResume);
export const PUT = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(updateResume));
export const DELETE = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN])(deleteResume));