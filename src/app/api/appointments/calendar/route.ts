import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

async function getCalendarAppointments(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const where: any = {
      scheduledDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (userId) {
      where.userId = userId;
    }

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
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

    // Group appointments by date
    const appointmentsByDate: { [key: string]: any[] } = {};
    
    appointments.forEach(appointment => {
      const dateKey = appointment.scheduledDate.toISOString().split('T')[0];
      if (!appointmentsByDate[dateKey]) {
        appointmentsByDate[dateKey] = [];
      }
      appointmentsByDate[dateKey].push(appointment);
    });

    // Calculate daily statistics
    const dailyStats = Object.keys(appointmentsByDate).map(date => ({
      date,
      totalAppointments: appointmentsByDate[date].length,
      confirmedAppointments: appointmentsByDate[date].filter(apt => apt.status === 'CONFIRMED').length,
      pendingAppointments: appointmentsByDate[date].filter(apt => apt.status === 'PENDING').length,
      completedAppointments: appointmentsByDate[date].filter(apt => apt.status === 'COMPLETED').length,
      cancelledAppointments: appointmentsByDate[date].filter(apt => apt.status === 'CANCELLED').length,
      appointments: appointmentsByDate[date],
    }));

    // Get available time slots for each day
    const availableSlots = await Promise.all(
      Object.keys(appointmentsByDate).map(async (date) => {
        const dayAppointments = appointmentsByDate[date];
        const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
        const slotDuration = 30; // 30 minutes
        
        const slots = [];
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          for (let minute = 0; minute < 60; minute += slotDuration) {
            const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
            
            const isAvailable = !dayAppointments.some(apt => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime);
              return (slotStart < aptEnd && slotEnd > aptStart);
            });
            
            if (isAvailable) {
              slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
              });
            }
          }
        }
        
        return { date, slots };
      })
    );

    return NextResponse.json({
      appointments,
      appointmentsByDate,
      dailyStats,
      availableSlots,
      summary: {
        totalAppointments: appointments.length,
        dateRange: { startDate, endDate },
        uniqueVisitors: new Set(appointments.map(apt => apt.visitorId)).size,
        uniqueUsers: new Set(appointments.map(apt => apt.userId)).size,
      },
    });
  } catch (error) {
    console.error('Get calendar appointments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCalendarAppointments);