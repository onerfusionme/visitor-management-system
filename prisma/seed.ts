import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { UserRole, VisitorCategory, IssueCategory, Priority, AppointmentStatus, IssueStatus } from '@prisma/client';

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const adminPassword = await hashPassword('password');
  const politicianPassword = await hashPassword('password');
  const staffPassword = await hashPassword('password');

  const admin = await db.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
      phone: '+91 98765 43210',
    },
  });

  const politician = await db.user.create({
    data: {
      email: 'politician@example.com',
      name: 'MLA Sharma',
      password: politicianPassword,
      role: UserRole.POLITICIAN,
      phone: '+91 98765 43211',
    },
  });

  const staff1 = await db.user.create({
    data: {
      email: 'staff@example.com',
      name: 'Staff Member',
      password: staffPassword,
      role: UserRole.STAFF,
      phone: '+91 98765 43212',
    },
  });

  const staff2 = await db.user.create({
    data: {
      email: 'staff2@example.com',
      name: 'Assistant Staff',
      password: staffPassword,
      role: UserRole.STAFF,
      phone: '+91 98765 43213',
    },
  });

  // Create demo visitors
  const visitor1 = await db.visitor.create({
    data: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 54321',
      email: 'ramesh@example.com',
      aadhaar: '1234 5678 9012',
      village: 'Dhanori',
      district: 'Pune',
      state: 'Maharashtra',
      category: VisitorCategory.FARMER,
      age: 45,
      gender: 'MALE',
      occupation: 'Farmer',
      address: 'Plot No. 123, Dhanori Village',
    },
  });

  const visitor2 = await db.visitor.create({
    data: {
      name: 'Sita Devi',
      phone: '+91 98765 54322',
      email: 'sita@example.com',
      aadhaar: '1234 5678 9013',
      village: 'Wagholi',
      district: 'Pune',
      state: 'Maharashtra',
      category: VisitorCategory.WOMEN,
      age: 35,
      gender: 'FEMALE',
      occupation: 'Housewife',
      address: 'House No. 456, Wagholi Village',
    },
  });

  const visitor3 = await db.visitor.create({
    data: {
      name: 'Rajesh Patel',
      phone: '+91 98765 54323',
      email: 'rajesh@example.com',
      aadhaar: '1234 5678 9014',
      village: 'Kharadi',
      district: 'Pune',
      state: 'Maharashtra',
      category: VisitorCategory.BUSINESSMAN,
      age: 40,
      gender: 'MALE',
      occupation: 'Business Owner',
      address: 'Shop No. 789, Kharadi Market',
    },
  });

  // Create demo appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const appointment1 = await db.appointment.create({
    data: {
      title: 'Discuss Water Supply Issue',
      description: 'Meeting regarding water shortage in Dhanori village',
      visitorId: visitor1.id,
      userId: politician.id,
      scheduledDate: tomorrow,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 30 * 60000), // 30 minutes
      status: AppointmentStatus.CONFIRMED,
      priority: Priority.HIGH,
      duration: 30,
      location: 'MLA Office',
    },
  });

  // Create demo visits
  const today = new Date();
  const visit1 = await db.visit.create({
    data: {
      visitorId: visitor2.id,
      userId: staff1.id,
      checkInTime: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      checkOutTime: new Date(today.getTime() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
      status: 'COMPLETED',
      purpose: 'Complaint about road conditions',
      notes: 'Visitor complained about poor road conditions in Wagholi. Issue noted for follow-up.',
      satisfaction: 4,
    },
  });

  // Create demo issues
  const issue1 = await db.issue.create({
    data: {
      title: 'Water Shortage in Dhanori Village',
      description: 'Severe water shortage affecting daily life and agriculture',
      category: IssueCategory.WATER,
      priority: Priority.URGENT,
      status: IssueStatus.IN_PROGRESS,
      visitorId: visitor1.id,
      village: 'Dhanori',
      district: 'Pune',
      assignedUserId: staff1.id,
      createdById: politician.id,
      dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      department: 'Water Supply Department',
      tags: JSON.stringify(['water', 'urgent', 'dhanori']),
    },
  });

  const issue2 = await db.issue.create({
    data: {
      title: 'Road Repair Needed',
      description: 'Main road in Wagholi is in poor condition with many potholes',
      category: IssueCategory.INFRASTRUCTURE,
      priority: Priority.HIGH,
      status: IssueStatus.OPEN,
      visitorId: visitor2.id,
      village: 'Wagholi',
      district: 'Pune',
      assignedUserId: staff2.id,
      createdById: staff1.id,
      dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      department: 'Public Works Department',
      estimatedCost: 50000,
      tags: JSON.stringify(['road', 'infrastructure', 'wagholi']),
    },
  });

  // Create demo notifications
  await db.notification.create({
    data: {
      userId: staff1.id,
      title: 'New Issue Assigned',
      message: 'Water shortage issue has been assigned to you',
      type: 'ISSUE_ASSIGNED',
      priority: Priority.URGENT,
      metadata: JSON.stringify({ issueId: issue1.id }),
    },
  });

  await db.notification.create({
    data: {
      userId: politician.id,
      title: 'Appointment Reminder',
      message: 'You have an appointment with Ramesh Kumar tomorrow at 10:00 AM',
      type: 'APPOINTMENT_REMINDER',
      priority: Priority.HIGH,
      metadata: JSON.stringify({ appointmentId: appointment1.id }),
    },
  });

  console.log('Database seeded successfully!');
  console.log('Demo credentials:');
  console.log('Admin: admin@example.com / password');
  console.log('Politician: politician@example.com / password');
  console.log('Staff: staff@example.com / password');
  console.log('Staff2: staff2@example.com / password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });