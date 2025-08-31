import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

async function getVisitorHistory(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get visitor basic info
    const visitor = await db.visitor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        village: true,
        district: true,
        state: true,
        category: true,
        age: true,
        gender: true,
        occupation: true,
        education: true,
        skills: true,
        visitCount: true,
        lastVisit: true,
        createdAt: true,
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Get visitor's complete history
    const [visits, appointments, issues, resumes] = await Promise.all([
      db.visit.findMany({
        where: { visitorId: id },
        take: limit,
        orderBy: { checkInTime: 'desc' },
        include: {
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
              priority: true,
            },
          },
        },
      }),
      db.appointment.findMany({
        where: { visitorId: id },
        take: limit,
        orderBy: { scheduledDate: 'desc' },
        include: {
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
              status: true,
            },
          },
        },
      }),
      db.issue.findMany({
        where: { visitorId: id },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
      db.resume.findMany({
        where: { visitorId: id, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate statistics
    const stats = {
      totalVisits: visits.length,
      completedVisits: visits.filter(v => v.status === 'COMPLETED').length,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === 'COMPLETED').length,
      totalIssues: issues.length,
      resolvedIssues: issues.filter(i => i.status === 'RESOLVED').length,
      inProgressIssues: issues.filter(i => i.status === 'IN_PROGRESS').length,
      escalatedIssues: issues.filter(i => i.status === 'ESCALATED').length,
      hasResume: resumes.length > 0,
      averageSatisfaction: visits.filter(v => v.satisfaction).length > 0 
        ? visits.filter(v => v.satisfaction).reduce((sum, v) => sum + v.satisfaction!, 0) / visits.filter(v => v.satisfaction).length 
        : 0,
      totalEstimatedCost: issues.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0),
      totalActualCost: issues.reduce((sum, issue) => sum + (issue.actualCost || 0), 0),
    };

    // Group visits by purpose/category
    const visitPurposes = visits.reduce((acc, visit) => {
      const purpose = visit.purpose || 'General Visit';
      acc[purpose] = (acc[purpose] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group issues by category
    const issueCategories = issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate visit frequency patterns
    const visitFrequency = calculateVisitFrequency(visits);
    
    // Calculate issue resolution timeline
    const issueResolutionTime = calculateIssueResolutionTime(issues);

    // Generate insights
    const insights = generateVisitorInsights(visitor, visits, appointments, issues, stats);

    return NextResponse.json({
      visitor,
      history: {
        visits,
        appointments,
        issues,
        resumes,
      },
      statistics: stats,
      analytics: {
        visitPurposes,
        issueCategories,
        visitFrequency,
        issueResolutionTime,
      },
      insights,
      summary: {
        firstVisit: visits[visits.length - 1]?.checkInTime || visitor.createdAt,
        lastVisit: visitor.lastVisit,
        totalEngagement: stats.totalVisits + stats.totalAppointments + stats.totalIssues,
        resolutionRate: stats.totalIssues > 0 ? (stats.resolvedIssues / stats.totalIssues) * 100 : 0,
        appointmentAttendanceRate: stats.totalAppointments > 0 ? (stats.completedAppointments / stats.totalAppointments) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Get visitor history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateVisitFrequency(visits: any[]) {
  const frequency = {
    thisWeek: 0,
    thisMonth: 0,
    last3Months: 0,
    last6Months: 0,
    thisYear: 0,
  };

  const now = new Date();
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  visits.forEach(visit => {
    const visitDate = visit.checkInTime;
    
    if (visitDate >= thisWeekStart) frequency.thisWeek++;
    if (visitDate >= thisMonthStart) frequency.thisMonth++;
    if (visitDate >= last3MonthsStart) frequency.last3Months++;
    if (visitDate >= last6MonthsStart) frequency.last6Months++;
    if (visitDate >= thisYearStart) frequency.thisYear++;
  });

  return frequency;
}

function calculateIssueResolutionTime(issues: any[]) {
  const resolvedIssues = issues.filter(issue => 
    issue.status === 'RESOLVED' && issue.resolvedDate && issue.createdAt
  );

  if (resolvedIssues.length === 0) {
    return {
      averageResolutionDays: 0,
      fastestResolution: null,
      slowestResolution: null,
    };
  }

  const resolutionTimes = resolvedIssues.map(issue => {
    const resolutionTime = issue.resolvedDate.getTime() - issue.createdAt.getTime();
    return resolutionTime / (1000 * 60 * 60 * 24); // Convert to days
  });

  return {
    averageResolutionDays: resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length,
    fastestResolution: Math.min(...resolutionTimes),
    slowestResolution: Math.max(...resolutionTimes),
  };
}

function generateVisitorInsights(visitor: any, visits: any[], appointments: any[], issues: any[], stats: any) {
  const insights = [];

  // Visit frequency insights
  if (stats.totalVisits === 0) {
    insights.push({
      type: 'info',
      message: 'This is a new visitor with no prior visits.',
      category: 'engagement',
    });
  } else if (stats.totalVisits >= 10) {
    insights.push({
      type: 'success',
      message: 'This is a highly engaged visitor with frequent interactions.',
      category: 'engagement',
    });
  } else if (stats.totalVisits >= 5) {
    insights.push({
      type: 'info',
      message: 'This visitor is moderately engaged with regular interactions.',
      category: 'engagement',
    });
  }

  // Issue resolution insights
  if (stats.totalIssues > 0) {
    const resolutionRate = (stats.resolvedIssues / stats.totalIssues) * 100;
    if (resolutionRate >= 80) {
      insights.push({
        type: 'success',
        message: `High issue resolution rate (${resolutionRate.toFixed(1)}%) indicates effective problem-solving.`,
        category: 'issues',
      });
    } else if (resolutionRate < 50) {
      insights.push({
        type: 'warning',
        message: `Low issue resolution rate (${resolutionRate.toFixed(1)}%) requires attention.`,
        category: 'issues',
      });
    }

    if (stats.escalatedIssues > 0) {
      insights.push({
        type: 'warning',
        message: `${stats.escalatedIssues} issue(s) have been escalated, indicating complex problems.`,
        category: 'issues',
      });
    }
  }

  // Youth-specific insights
  if (visitor.category === 'STUDENT' || visitor.category === 'YOUTH') {
    if (!stats.hasResume) {
      insights.push({
        type: 'info',
        message: 'Youth visitor without resume - consider collecting for employment opportunities.',
        category: 'youth',
      });
    } else {
      insights.push({
        type: 'success',
        message: 'Youth visitor with resume on file - ready for employment opportunities.',
        category: 'youth',
      });
    }

    if (visitor.education && visitor.skills) {
      insights.push({
        type: 'success',
        message: 'Comprehensive youth profile with education and skills data available.',
        category: 'youth',
      });
    }
  }

  // Satisfaction insights
  if (stats.averageSatisfaction > 0) {
    if (stats.averageSatisfaction >= 4) {
      insights.push({
        type: 'success',
        message: `High satisfaction rating (${stats.averageSatisfaction.toFixed(1)}/5) indicates positive experiences.`,
        category: 'satisfaction',
      });
    } else if (stats.averageSatisfaction < 3) {
      insights.push({
        type: 'warning',
        message: `Low satisfaction rating (${stats.averageSatisfaction.toFixed(1)}/5) requires attention.`,
        category: 'satisfaction',
      });
    }
  }

  // Cost insights
  if (stats.totalEstimatedCost > 0) {
    const costVariance = stats.totalActualCost - stats.totalEstimatedCost;
    const variancePercentage = (costVariance / stats.totalEstimatedCost) * 100;
    
    if (Math.abs(variancePercentage) > 20) {
      insights.push({
        type: 'warning',
        message: `Significant cost variance (${variancePercentage.toFixed(1)}%) in issue resolution.`,
        category: 'costs',
      });
    }
  }

  return insights;
}

export const GET = withAuth(getVisitorHistory);