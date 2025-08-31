import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, VisitStatus } from '@prisma/client';
import { z } from 'zod';

const createVisitSchema = z.object({
  visitorId: z.string().min(1, 'Visitor ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  appointmentId: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateVisitSchema = z.object({
  status: z.nativeEnum(VisitStatus).optional(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  satisfaction: z.number().min(1).max(5).optional().nullable(),
});

// GET /api/visits - Get all visits
async function getVisits(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const visitorId = searchParams.get('visitorId');
    const date = searchParams.get('date');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (visitorId) {
      where.visitorId = visitorId;
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.checkInTime = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    const [visits, total] = await Promise.all([
      db.visit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' },
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
      }),
      db.visit.count({ where }),
    ]);

    return NextResponse.json({
      visits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get visits error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/visits - Create a new visit (check-in)
async function createVisit(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, userId, appointmentId, purpose, notes } = createVisitSchema.parse(body);

    // Verify visitor exists
    const visitor = await db.visitor.findUnique({
      where: { id: visitorId },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If appointmentId is provided, verify it exists and update its status
    if (appointmentId) {
      const appointment = await db.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Update appointment status to completed
      await db.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    // Check if visitor already has an active visit
    const activeVisit = await db.visit.findFirst({
      where: {
        visitorId,
        status: VisitStatus.IN_PROGRESS,
      },
    });

    if (activeVisit) {
      return NextResponse.json(
        { error: 'Visitor already has an active visit' },
        { status: 409 }
      );
    }

    const visit = await db.visit.create({
      data: {
        visitorId,
        userId,
        appointmentId,
        checkInTime: new Date(),
        status: VisitStatus.IN_PROGRESS,
        purpose,
        notes,
      },
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

    // Update visitor's visit count and last visit
    await db.visitor.update({
      where: { id: visitorId },
      data: {
        visitCount: {
          increment: 1,
        },
        lastVisit: new Date(),
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

    console.error('Create visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVisits);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createVisit));