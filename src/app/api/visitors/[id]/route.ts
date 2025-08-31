import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/middleware';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const updateVisitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  aadhaar: z.string().optional().nullable(),
  voterId: z.string().optional().nullable(),
  village: z.string().min(1, 'Village is required').optional(),
  district: z.string().min(1, 'District is required').optional(),
  state: z.string().optional(),
  address: z.string().optional().nullable(),
  category: z.nativeEnum(require('@prisma/client').VisitorCategory).optional(),
  age: z.number().min(1).max(120).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  occupation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: { id: string };
}

// GET /api/visitors/[id] - Get a specific visitor
async function getVisitor(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const visitor = await db.visitor.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { checkInTime: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        appointments: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        issues: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
            assignedTo: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ visitor });
  } catch (error) {
    console.error('Get visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/visitors/[id] - Update a visitor
async function updateVisitor(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const validatedData = updateVisitorSchema.parse(body);

    // Check if visitor exists
    const existingVisitor = await db.visitor.findUnique({
      where: { id },
    });

    if (!existingVisitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Check for duplicate phone, aadhaar, or voterId (excluding current visitor)
    if (validatedData.phone || validatedData.aadhaar || validatedData.voterId) {
      const duplicateVisitor = await db.visitor.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(validatedData.phone ? [{ phone: validatedData.phone }] : []),
                ...(validatedData.aadhaar ? [{ aadhaar: validatedData.aadhaar }] : []),
                ...(validatedData.voterId ? [{ voterId: validatedData.voterId }] : []),
              ],
            },
          ],
        },
      });

      if (duplicateVisitor) {
        return NextResponse.json(
          { error: 'Another visitor with this phone, Aadhaar, or Voter ID already exists' },
          { status: 409 }
        );
      }
    }

    const visitor = await db.visitor.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      visitor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/visitors/[id] - Delete a visitor (soft delete)
async function deleteVisitor(req: NextRequest, context: RouteParams) {
  try {
    const { id } = context.params;

    const visitor = await db.visitor.findUnique({
      where: { id },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await db.visitor.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Visitor deleted successfully',
    });
  } catch (error) {
    console.error('Delete visitor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVisitor);
export const PUT = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN, UserRole.STAFF])(updateVisitor));
export const DELETE = withAuth(withRole([UserRole.ADMIN, UserRole.POLITICIAN])(deleteVisitor));