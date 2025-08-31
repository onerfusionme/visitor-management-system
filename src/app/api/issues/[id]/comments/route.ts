import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const createCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/issues/[id]/comments - Get all comments for an issue
async function getComments(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    // Check if issue exists
    const issue = await db.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const comments = await db.issueComment.findMany({
      where: { issueId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/issues/[id]/comments - Add a comment to an issue
async function createComment(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const { comment } = createCommentSchema.parse(body);

    // Check if issue exists
    const issue = await db.issue.findUnique({
      where: { id },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const newComment = await db.issueComment.create({
      data: {
        issueId: id,
        userId: req.user.userId,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: newComment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getComments);
export const POST = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(createComment));