import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, VisitStatus } from '@prisma/client';
import { z } from 'zod';

const checkInSchema = z.object({
  visitorId: z.string().min(1, 'Visitor ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  appointmentId: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const checkOutSchema = z.object({
  visitId: z.string().min(1, 'Visit ID is required'),
  notes: z.string().optional().nullable(),
  satisfaction: z.number().min(1).max(5).optional().nullable(),
});

const updateQueuePositionSchema = z.object({
  visitId: z.string().min(1, 'Visit ID is required'),
  newPosition: z.number().min(0, 'New position must be 0 or greater'),
});

// POST /api/queue/actions/checkin - Check in a visitor
async function checkInVisitor(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, userId, appointmentId, purpose, notes } = checkInSchema.parse(body);

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

      // Update appointment status to in progress
      await db.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' },
      });
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

    // Emit real-time update via Socket.IO (this will be handled by the socket server)
    // The socket server will pick up this change and broadcast it

    return NextResponse.json({
      success: true,
      message: 'Visitor checked in successfully',
      visit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Check-in visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/queue/actions/checkout - Check out a visitor
async function checkOutVisitor(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitId, notes, satisfaction } = checkOutSchema.parse(body);

    // Check if visit exists and is in progress
    const visit = await db.visit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    if (visit.status !== VisitStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Visit is not in progress' },
        { status: 400 }
      );
    }

    const updatedVisit = await db.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.COMPLETED,
        checkOutTime: new Date(),
        notes: notes || visit.notes,
        satisfaction,
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

    // Update associated appointment status if exists
    if (visit.appointmentId) {
      await db.appointment.update({
        where: { id: visit.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    // Emit real-time update via Socket.IO
    // The socket server will pick up this change and broadcast it

    return NextResponse.json({
      success: true,
      message: 'Visitor checked out successfully',
      visit: updatedVisit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Check-out visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/queue/actions/cancel - Cancel a visit
async function cancelVisit(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitId, notes } = z.object({
      visitId: z.string().min(1, 'Visit ID is required'),
      notes: z.string().optional().nullable(),
    }).parse(body);

    // Check if visit exists and is in progress
    const visit = await db.visit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    if (visit.status !== VisitStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Visit is not in progress' },
        { status: 400 }
      );
    }

    const updatedVisit = await db.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.CANCELLED,
        checkOutTime: new Date(),
        notes: notes || visit.notes,
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
      },
    });

    // Update associated appointment status if exists
    if (visit.appointmentId) {
      await db.appointment.update({
        where: { id: visit.appointmentId },
        data: { status: 'CANCELLED' },
      });
    }

    // Emit real-time update via Socket.IO
    // The socket server will pick up this change and broadcast it

    return NextResponse.json({
      success: true,
      message: 'Visit cancelled successfully',
      visit: updatedVisit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Cancel visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'checkin':
      return checkInVisitor(req);
    case 'checkout':
      return checkOutVisitor(req);
    case 'cancel':
      return cancelVisit(req);
    default:
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
  }
}));