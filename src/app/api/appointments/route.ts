import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, AppointmentStatus, Priority } from '@prisma/client';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  visitorId: z.string().min(1, 'Visitor ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.number().min(15).max(240).default(30),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
});

// GET /api/appointments - Get all appointments
async function getAppointments(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const visitorId = searchParams.get('visitorId');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (visitorId) {
      where.visitorId = visitorId;
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledDate: 'asc' },
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
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          visits: {
            select: {
              id: true,
              checkInTime: true,
              checkOutTime: true,
              status: true,
            },
          },
        },
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create a new appointment
async function createAppointment(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      visitorId,
      userId,
      scheduledDate,
      startTime,
      duration,
      location,
      notes,
      priority,
    } = createAppointmentSchema.parse(body);

    // Parse dates
    const scheduledDateTime = new Date(`${scheduledDate}T${startTime}`);
    const endTime = new Date(scheduledDateTime.getTime() + duration * 60000);

    // Check for scheduling conflicts
    const conflicts = await db.appointment.findMany({
      where: {
        userId,
        scheduledDate: new Date(scheduledDate),
        OR: [
          {
            AND: [
              { startTime: { lte: scheduledDateTime } },
              { endTime: { gt: scheduledDateTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: scheduledDateTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
      },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Scheduling conflict detected. Please choose a different time.' },
        { status: 409 }
      );
    }

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

    const appointment = await db.appointment.create({
      data: {
        title,
        description,
        visitorId,
        userId,
        scheduledDate: new Date(scheduledDate),
        startTime: scheduledDateTime,
        endTime,
        duration,
        location,
        notes,
        priority,
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
        user: {
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
      appointment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAppointments);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createAppointment));