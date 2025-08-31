import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

async function getDashboardAnalytics(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total visitors count
    const totalVisitors = await db.visitor.count({
      where: { isActive: true }
    });

    // Get today's visits
    const todayVisits = await db.visit.count({
      where: {
        checkInTime: {
          gte: today,
          lt: tomorrow,
        }
      }
    });

    // Get completed visits today
    const completedVisits = await db.visit.count({
      where: {
        checkInTime: {
          gte: today,
          lt: tomorrow,
        },
        status: 'COMPLETED'
      }
    });

    // Get active queue count (visits in progress)
    const activeQueue = await db.visit.count({
      where: { status: 'IN_PROGRESS' }
    });

    // Get pending issues count
    const pendingIssues = await db.issue.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    });

    // Get today's appointments
    const todayAppointments = await db.appointment.count({
      where: {
        scheduledDate: today,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      }
    });

    // Get youth visitors count (with resumes)
    const youthWithResumes = await db.visitor.count({
      where: {
        category: {
          in: ['STUDENT', 'YOUTH', 'UNEMPLOYED']
        },
        resumes: {
          some: { isActive: true }
        }
      }
    });

    // Get average satisfaction rating
    const satisfactionStats = await db.visit.aggregate({
      where: {
        satisfaction: { not: null },
        checkInTime: {
          gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _avg: {
        satisfaction: true
      }
    });

    // Get monthly stats for trends
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlyVisits = await db.visit.count({
      where: {
        checkInTime: {
          gte: lastMonth
        }
      }
    });

    const monthlyIssues = await db.issue.count({
      where: {
        createdAt: {
          gte: lastMonth
        }
      }
    });

    const monthlyResolvedIssues = await db.issue.count({
      where: {
        createdAt: {
          gte: lastMonth
        },
        status: 'RESOLVED'
      }
    });

    return NextResponse.json({
      totalVisitors,
      todayVisits,
      activeQueue,
      pendingIssues,
      todayAppointments,
      completedVisits,
      youthWithResumes,
      averageSatisfaction: satisfactionStats._avg.satisfaction || 0,
      monthlyStats: {
        visits: monthlyVisits,
        issues: monthlyIssues,
        resolvedIssues: monthlyResolvedIssues,
        resolutionRate: monthlyIssues > 0 ? (monthlyResolvedIssues / monthlyIssues) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getDashboardAnalytics);