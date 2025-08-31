import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, VisitStatus } from '@prisma/client';
import { z } from 'zod';

const updateVisitSchema = z.object({
  status: z.nativeEnum(VisitStatus).optional(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  satisfaction: z.number().min(1).max(5).optional().nullable(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/visits/[id] - Get a specific visit
async function getVisit(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const visit = await db.visit.findUnique({
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
            occupation: true,
            age: true,
            gender: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            description: true,
            scheduledDate: true,
            startTime: true,
            endTime: true,
            priority: true,
            location: true,
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ visit });
  } catch (error) {
    console.error('Get visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/visits/[id] - Update a visit
async function updateVisit(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const validatedData = updateVisitSchema.parse(body);

    // Check if visit exists
    const existingVisit = await db.visit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    // If status is being changed to COMPLETED, set checkOutTime
    if (validatedData.status === VisitStatus.COMPLETED && existingVisit.status !== VisitStatus.COMPLETED) {
      validatedData.checkOutTime = new Date();
    }

    const visit = await db.visit.update({
      where: { id },
      data: validatedData,
      include: {
        visitor: {
          select: {
            id: true,
            name: true,
            phone: true,
            village: true,
            district: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            startTime: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      visit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/visits/[id] - Delete a visit
async function deleteVisit(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const visit = await db.visit.findUnique({
      where: { id },
    });

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    await db.visit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Visit deleted successfully',
    });
  } catch (error) {
    console.error('Delete visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVisit);
export const PUT = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(updateVisit));
export const DELETE = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN])(deleteVisit));