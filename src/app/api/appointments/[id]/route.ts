import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

const updateAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  userId: z.string().min(1, 'User ID is required').optional(),
  scheduledDate: z.string().min(1, 'Scheduled date is required').optional(),
  startTime: z.string().min(1, 'Start time is required').optional(),
  duration: z.number().min(15).max(240).optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  priority: z.nativeEnum(require('@prisma/client').Priority).optional(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/appointments/[id] - Get a specific appointment
async function getAppointment(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const appointment = await db.appointment.findUnique({
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
        visits: {
          orderBy: { checkInTime: 'desc' },
          select: {
            id: true,
            checkInTime: true,
            checkOutTime: true,
            status: true,
            purpose: true,
            notes: true,
            satisfaction: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments/[id] - Update an appointment
async function updateAppointment(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const validatedData = updateAppointmentSchema.parse(body);

    // Check if appointment exists
    const existingAppointment = await db.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // If updating time, check for conflicts
    if (validatedData.scheduledDate || validatedData.startTime || validatedData.duration) {
      const scheduledDate = validatedData.scheduledDate 
        ? new Date(validatedData.scheduledDate)
        : existingAppointment.scheduledDate;
      
      const startTime = validatedData.startTime
        ? new Date(`${scheduledDate.toISOString().split('T')[0]}T${validatedData.startTime}`)
        : existingAppointment.startTime;
      
      const duration = validatedData.duration || existingAppointment.duration;
      const endTime = new Date(startTime.getTime() + duration * 60000);
      const userId = validatedData.userId || existingAppointment.userId;

      const conflicts = await db.appointment.findMany({
        where: {
          userId,
          scheduledDate,
          id: { not: id },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
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
                { startTime: { gte: startTime } },
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

      // Update with new time data
      validatedData.scheduledDate = scheduledDate;
      validatedData.startTime = startTime;
      validatedData.endTime = endTime;
    }

    const appointment = await db.appointment.update({
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

    console.error('Update appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
async function deleteAppointment(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const appointment = await db.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    await db.appointment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAppointment);
export const PUT = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(updateAppointment));
export const DELETE = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN])(deleteAppointment));