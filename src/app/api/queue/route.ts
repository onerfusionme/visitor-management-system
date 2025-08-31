import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';
import { VisitStatus, Priority } from '@prisma/client';

async function getQueueStatus(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Get current active visits (in progress)
    const activeVisits = await db.visit.findMany({
      where: {
        status: VisitStatus.IN_PROGRESS,
        ...(userId && { userId }),
      },
      orderBy: { checkInTime: 'asc' },
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
            priority: true,
            scheduledDate: true,
            startTime: true,
          },
        },
      },
    });

    // Get today's completed visits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const completedVisitsToday = await db.visit.findMany({
      where: {
        status: VisitStatus.COMPLETED,
        checkInTime: {
          gte: today,
          lt: tomorrow,
        },
        ...(userId && { userId }),
      },
      orderBy: { checkOutTime: 'desc' },
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

    // Get appointments scheduled for today that haven't been visited yet
    const scheduledAppointmentsToday = await db.appointment.findMany({
      where: {
        scheduledDate: today,
        status: {
          notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
        },
        visits: {
          none: {},
        },
        ...(userId && { userId }),
      },
      orderBy: [{ priority: 'desc' }, { startTime: 'asc' }],
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

    // Calculate queue statistics
    const queueStats = {
      totalActive: activeVisits.length,
      totalCompletedToday: completedVisitsToday.length,
      totalScheduledToday: scheduledAppointmentsToday.length,
      averageWaitTime: 0,
      averageVisitDuration: 0,
    };

    // Calculate average wait time for completed visits
    if (completedVisitsToday.length > 0) {
      const totalWaitTime = completedVisitsToday.reduce((sum, visit) => {
        const appointment = visit.appointment;
        if (appointment && appointment.startTime) {
          const waitTime = visit.checkInTime.getTime() - appointment.startTime.getTime();
          return sum + waitTime;
        }
        return sum;
      }, 0);
      queueStats.averageWaitTime = totalWaitTime / completedVisitsToday.length / (1000 * 60); // Convert to minutes
    }

    // Calculate average visit duration
    if (completedVisitsToday.length > 0) {
      const totalDuration = completedVisitsToday.reduce((sum, visit) => {
        if (visit.checkOutTime) {
          const duration = visit.checkOutTime.getTime() - visit.checkInTime.getTime();
          return sum + duration;
        }
        return sum;
      }, 0);
      queueStats.averageVisitDuration = totalDuration / completedVisitsToday.length / (1000 * 60); // Convert to minutes
    }

    // Calculate estimated wait times for scheduled appointments
    const appointmentsWithEstimates = scheduledAppointmentsToday.map(appointment => {
      const estimatedWaitTime = queueStats.averageVisitDuration * activeVisits.length;
      return {
        ...appointment,
        estimatedWaitTime: Math.max(0, estimatedWaitTime),
        estimatedStartTime: new Date(Date.now() + estimatedWaitTime * 60000),
      };
    });

    // Sort active visits by priority and check-in time
    const sortedActiveVisits = [...activeVisits].sort((a, b) => {
      // First sort by priority (if appointment exists)
      const priorityA = a.appointment?.priority || Priority.NORMAL;
      const priorityB = b.appointment?.priority || Priority.NORMAL;
      
      if (priorityA !== priorityB) {
        const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
        return priorityOrder[priorityB] - priorityOrder[priorityA];
      }
      
      // Then sort by check-in time
      return a.checkInTime.getTime() - b.checkInTime.getTime();
    });

    return NextResponse.json({
      activeVisits: sortedActiveVisits,
      completedVisitsToday,
      scheduledAppointmentsToday: appointmentsWithEstimates,
      queueStats,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getQueueStatus);