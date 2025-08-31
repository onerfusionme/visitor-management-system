import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole, IssueStatus } from '@prisma/client';
import { z } from 'zod';

const updateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  category: z.nativeEnum(require('@prisma/client').IssueCategory).optional(),
  priority: z.nativeEnum(require('@prisma/client').Priority).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  assignedUserId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  resolvedDate: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  actualCost: z.number().optional().nullable(),
  department: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/issues/[id] - Get a specific issue
async function getIssue(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const issue = await db.issue.findUnique({
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
            phone: true,
            email: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
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
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedIssue = {
      ...issue,
      tags: issue.tags ? JSON.parse(issue.tags) : [],
      photos: issue.photos ? JSON.parse(issue.photos) : [],
    };

    return NextResponse.json({ issue: parsedIssue });
  } catch (error) {
    console.error('Get issue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/issues/[id] - Update an issue
async function updateIssue(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const validatedData = updateIssueSchema.parse(body);

    // Check if issue exists
    const existingIssue = await db.issue.findUnique({
      where: { id },
    });

    if (!existingIssue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // If assignedUserId is provided, verify user exists
    if (validatedData.assignedUserId) {
      const assignedUser = await db.user.findUnique({
        where: { id: validatedData.assignedUserId },
      });

      if (!assignedUser) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Handle date fields
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    if (validatedData.resolvedDate) {
      updateData.resolvedDate = new Date(validatedData.resolvedDate);
    }

    // Handle JSON fields
    if (validatedData.tags) {
      updateData.tags = JSON.stringify(validatedData.tags);
    }

    if (validatedData.photos) {
      updateData.photos = JSON.stringify(validatedData.photos);
    }

    // Auto-set resolvedDate when status is RESOLVED or CLOSED
    if (validatedData.status === IssueStatus.RESOLVED || validatedData.status === IssueStatus.CLOSED) {
      if (!existingIssue.resolvedDate) {
        updateData.resolvedDate = new Date();
      }
    }

    // Clear resolvedDate when status is changed back from RESOLVED/CLOSED
    if (validatedData.status && validatedData.status !== IssueStatus.RESOLVED && validatedData.status !== IssueStatus.CLOSED) {
      updateData.resolvedDate = null;
    }

    const issue = await db.issue.update({
      where: { id },
      data: updateData,
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        createdBy: {
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
      issue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update issue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/issues/[id] - Delete an issue
async function deleteIssue(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const issue = await db.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    await db.issue.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error) {
    console.error('Delete issue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getIssue);
export const PUT = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(updateIssue));
export const DELETE = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN])(deleteIssue));