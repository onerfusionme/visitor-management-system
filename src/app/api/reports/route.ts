import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { db } from '@/lib/db';
import { VisitorCategory, IssueCategory, Priority, AppointmentStatus, IssueStatus, VisitStatus } from '@prisma/client';

async function generateReport(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'comprehensive';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';
    const village = searchParams.get('village');
    const district = searchParams.get('district');
    const category = searchParams.get('category');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include end of day

    const baseWhere = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    const visitorWhere: any = { ...baseWhere, isActive: true };
    const appointmentWhere: any = { ...baseWhere };
    const visitWhere: any = { ...baseWhere };
    const issueWhere: any = {baseWhere };

    // Apply filters
    if (village) {
      visitorWhere.village = { contains: village, mode: 'insensitive' };
      appointmentWhere.visitor = { village: { contains: village, mode: 'insensitive' } };
      visitWhere.visitor = { village: { contains: village, mode: 'insensitive' } };
      issueWhere.village = { contains: village, mode: 'insensitive' };
    }

    if (district) {
      visitorWhere.district = { contains: district, mode: 'insensitive' };
      appointmentWhere.visitor = { district: { contains: district, mode: 'insensitive' } };
      visitWhere.visitor = { district: { contains: district, mode: 'insensitive' } };
      issueWhere.district = { contains: district, mode: 'insensitive' };
    }

    if (category) {
      visitorWhere.category = category;
    }

    let reportData: any = {};

    switch (reportType) {
      case 'visitors':
        reportData = await generateVisitorReport(visitorWhere);
        break;
      case 'appointments':
        reportData = await generateAppointmentReport(appointmentWhere);
        break;
      case 'visits':
        reportData = await generateVisitReport(visitWhere);
        break;
      case 'issues':
        reportData = await generateIssueReport(issueWhere);
        break;
      case 'youth':
        reportData = await generateYouthReport(visitorWhere);
        break;
      case 'comprehensive':
      default:
        reportData = await generateComprehensiveReport(visitorWhere, appointmentWhere, visitWhere, issueWhere);
        break;
    }

    // Add report metadata
    const report = {
      ...reportData,
      metadata: {
        reportType,
        dateRange: { startDate, endDate },
        generatedAt: new Date(),
        filters: { village, district, category },
        totalRecords: reportData.summary?.totalRecords || 0,
      },
    };

    if (format === 'csv') {
      return generateCSVReport(report, reportType);
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateVisitorReport(where: any) {
  const visitors = await db.visitor.findMany({
    where,
    include: {
      _count: {
        select: {
          visits: true,
          appointments: true,
          issues: true,
        },
      },
    },
  });

  const categoryStats = visitors.reduce((acc, visitor) => {
    acc[visitor.category] = (acc[visitor.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const villageStats = visitors.reduce((acc, visitor) => {
    acc[visitor.village] = (acc[visitor.village] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const districtStats = visitors.reduce((acc, visitor) => {
    acc[visitor.district] = (acc[visitor.district] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    visitors,
    categoryStats,
    villageStats,
    districtStats,
    summary: {
      totalVisitors: visitors.length,
      totalRecords: visitors.length,
      newVisitors: visitors.length,
      averageAge: visitors.reduce((sum, v) => sum + (v.age || 0), 0) / visitors.length,
      totalVisits: visitors.reduce((sum, v) => sum + v.visitCount, 0),
    },
  };
}

async function generateAppointmentReport(where: any) {
  const appointments = await db.appointment.findMany({
    where,
    include: {
      visitor: {
        select: {
          name: true,
          village: true,
          district: true,
          category: true,
        },
      },
      user: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  const statusStats = appointments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityStats = appointments.reduce((acc, apt) => {
    acc[apt.priority] = (acc[apt.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    appointments,
    statusStats,
    priorityStats,
    summary: {
      totalAppointments: appointments.length,
      totalRecords: appointments.length,
      completionRate: (statusStats['COMPLETED'] || 0) / appointments.length * 100,
      cancellationRate: (statusStats['CANCELLED'] || 0) / appointments.length * 100,
      noShowRate: (statusStats['NO_SHOW'] || 0) / appointments.length * 100,
    },
  };
}

async function generateVisitReport(where: any) {
  const visits = await db.visit.findMany({
    where,
    include: {
      visitor: {
        select: {
          name: true,
          village: true,
          district: true,
          category: true,
        },
      },
      user: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  const statusStats = visits.reduce((acc, visit) => {
    acc[visit.status] = (acc[visit.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const satisfactionStats = visits
    .filter(v => v.satisfaction)
    .reduce((acc, visit) => {
      const rating = visit.satisfaction!;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  const averageDuration = visits
    .filter(v => v.checkOutTime)
    .reduce((sum, visit) => {
      const duration = visit.checkOutTime!.getTime() - visit.checkInTime.getTime();
      return sum + duration;
    }, 0) / visits.filter(v => v.checkOutTime).length / (1000 * 60); // Convert to minutes

  return {
    visits,
    statusStats,
    satisfactionStats,
    summary: {
      totalVisits: visits.length,
      totalRecords: visits.length,
      completionRate: (statusStats['COMPLETED'] || 0) / visits.length * 100,
      averageSatisfaction: visits.filter(v => v.satisfaction).reduce((sum, v) => sum + v.satisfaction!, 0) / visits.filter(v => v.satisfaction).length,
      averageDuration: averageDuration,
    },
  };
}

async function generateIssueReport(where: any) {
  const issues = await db.issue.findMany({
    where,
    include: {
      visitor: {
        select: {
          name: true,
          village: true,
          district: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          role: true,
        },
      },
      assignedTo: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  const categoryStats = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusStats = issues.reduce((acc, issue) => {
    acc[issue.status] = (acc[issue.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityStats = issues.reduce((acc, issue) => {
    acc[issue.priority] = (acc[issue.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEstimatedCost = issues.reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);
  const totalActualCost = issues.reduce((sum, issue) => sum + (issue.actualCost || 0), 0);

  return {
    issues,
    categoryStats,
    statusStats,
    priorityStats,
    summary: {
      totalIssues: issues.length,
      totalRecords: issues.length,
      resolutionRate: (statusStats['RESOLVED'] || 0) / issues.length * 100,
      escalationRate: (statusStats['ESCALATED'] || 0) / issues.length * 100,
      totalEstimatedCost,
      totalActualCost,
      costVariance: totalActualCost - totalEstimatedCost,
    },
  };
}

async function generateYouthReport(where: any) {
  const youthCategories = [VisitorCategory.STUDENT, VisitorCategory.YOUTH, VisitorCategory.UNEMPLOYED];
  const youthWhere = { ...where, category: { in: youthCategories } };

  const youthVisitors = await db.visitor.findMany({
    where: youthWhere,
    include: {
      resumes: {
        where: { isActive: true },
      },
      visits: {
        include: {
          user: {
            select: { name: true, role: true },
          },
        },
      },
      appointments: {
        include: {
          user: {
            select: { name: true, role: true },
          },
        },
      },
      issues: {
        include: {
          createdBy: {
            select: { name: true, role: true },
          },
        },
      },
    },
  });

  const educationStats = youthVisitors.reduce((acc, visitor) => {
    const education = visitor.education || 'Not Specified';
    acc[education] = (acc[education] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const resumeStats = {
    totalWithResumes: youthVisitors.filter(v => v.resumes.length > 0).length,
    totalWithoutResumes: youthVisitors.filter(v => v.resumes.length === 0).length,
  };

  const skillStats = youthVisitors
    .filter(v => v.skills)
    .reduce((acc, visitor) => {
      const skills = JSON.parse(visitor.skills!) as string[];
      skills.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

  return {
    youthVisitors,
    educationStats,
    resumeStats,
    skillStats,
    summary: {
      totalYouth: youthVisitors.length,
      totalRecords: youthVisitors.length,
      withResumes: resumeStats.totalWithResumes,
      withoutResumes: resumeStats.totalWithoutResumes,
      resumeCoverageRate: (resumeStats.totalWithResumes / youthVisitors.length) * 100,
      averageVisitsPerYouth: youthVisitors.reduce((sum, v) => sum + v.visits.length, 0) / youthVisitors.length,
    },
  };
}

async function generateComprehensiveReport(visitorWhere: any, appointmentWhere: any, visitWhere: any, issueWhere: any) {
  const [visitorReport, appointmentReport, visitReport, issueReport, youthReport] = await Promise.all([
    generateVisitorReport(visitorWhere),
    generateAppointmentReport(appointmentWhere),
    generateVisitReport(visitWhere),
    generateIssueReport(issueWhere),
    generateYouthReport(visitorWhere),
  ]);

  return {
    visitorReport,
    appointmentReport,
    visitReport,
    issueReport,
    youthReport,
    summary: {
      totalRecords: 
        visitorReport.summary.totalRecords +
        appointmentReport.summary.totalRecords +
        visitReport.summary.totalRecords +
        issueReport.summary.totalRecords,
      reportPeriod: {
        start: visitorWhere.createdAt.gte,
        end: visitorWhere.createdAt.lte,
      },
      overview: {
        newVisitors: visitorReport.summary.newVisitors,
        totalAppointments: appointmentReport.summary.totalAppointments,
        totalVisits: visitReport.summary.totalVisits,
        totalIssues: issueReport.summary.totalIssues,
        totalYouth: youthReport.summary.totalYouth,
      },
    },
  };
}

function generateCSVReport(report: any, reportType: string): NextResponse {
  let csvContent = '';
  let filename = '';

  switch (reportType) {
    case 'visitors':
      csvContent = generateVisitorCSV(report.visitors);
      filename = `visitors_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'appointments':
      csvContent = generateAppointmentCSV(report.appointments);
      filename = `appointments_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'visits':
      csvContent = generateVisitCSV(report.visits);
      filename = `visits_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'issues':
      csvContent = generateIssueCSV(report.issues);
      filename = `issues_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
    case 'youth':
      csvContent = generateYouthCSV(report.youthVisitors);
      filename = `youth_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
    default:
      csvContent = 'Report type not supported for CSV export';
      filename = `report_${new Date().toISOString().split('T')[0]}.csv`;
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function generateVisitorCSV(visitors: any[]): string {
  const headers = [
    'Name', 'Phone', 'Email', 'Village', 'District', 'State', 
    'Category', 'Age', 'Gender', 'Occupation', 'Education', 
    'Visit Count', 'Last Visit', 'Created At'
  ];
  
  const rows = visitors.map(v => [
    v.name, v.phone, v.email || '', v.village, v.district, v.state,
    v.category, v.age || '', v.gender || '', v.occupation || '', v.education || '',
    v.visitCount, v.lastVisit ? v.lastVisit.toISOString().split('T')[0] : '',
    v.createdAt.toISOString().split('T')[0]
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateAppointmentCSV(appointments: any[]): string {
  const headers = [
    'Title', 'Visitor Name', 'Village', 'User Name', 'Scheduled Date',
    'Start Time', 'End Time', 'Status', 'Priority', 'Duration', 'Location'
  ];
  
  const rows = appointments.map(a => [
    a.title, a.visitor.name, a.visitor.village, a.user.name,
    a.scheduledDate.toISOString().split('T')[0],
    a.startTime.toISOString().split('T')[1].substring(0, 5),
    a.endTime.toISOString().split('T')[1].substring(0, 5),
    a.status, a.priority, a.duration, a.location || ''
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateVisitCSV(visits: any[]): string {
  const headers = [
    'Visitor Name', 'Village', 'User Name', 'Check In Time',
    'Check Out Time', 'Status', 'Purpose', 'Satisfaction', 'Notes'
  ];
  
  const rows = visits.map(v => [
    v.visitor.name, v.visitor.village, v.user.name,
    v.checkInTime.toISOString().replace('T', ' ').substring(0, 19),
    v.checkOutTime ? v.checkOutTime.toISOString().replace('T', ' ').substring(0, 19) : '',
    v.status, v.purpose || '', v.satisfaction || '', v.notes || ''
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateIssueCSV(issues: any[]): string {
  const headers = [
    'Title', 'Category', 'Priority', 'Status', 'Village', 'District',
    'Visitor Name', 'Created By', 'Assigned To', 'Created Date',
    'Due Date', 'Estimated Cost', 'Actual Cost', 'Resolution'
  ];
  
  const rows = issues.map(i => [
    i.title, i.category, i.priority, i.status, i.village || '', i.district || '',
    i.visitor?.name || '', i.createdBy?.name || '', i.assignedTo?.name || '',
    i.createdAt.toISOString().split('T')[0],
    i.dueDate ? i.dueDate.toISOString().split('T')[0] : '',
    i.estimatedCost || '', i.actualCost || '', i.resolution || ''
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateYouthCSV(youthVisitors: any[]): string {
  const headers = [
    'Name', 'Phone', 'Email', 'Village', 'District', 'Category',
    'Age', 'Gender', 'Education', 'Occupation', 'Skills',
    'Has Resume', 'Visit Count', 'Last Visit'
  ];
  
  const rows = youthVisitors.map(v => [
    v.name, v.phone, v.email || '', v.village, v.district, v.category,
    v.age || '', v.gender || '', v.education || '', v.occupation || '',
    v.skills ? JSON.parse(v.skills).join(', ') : '',
    v.resumes.length > 0 ? 'Yes' : 'No', v.visitCount,
    v.lastVisit ? v.lastVisit.toISOString().split('T')[0] : ''
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export const GET = withAuth(generateReport);