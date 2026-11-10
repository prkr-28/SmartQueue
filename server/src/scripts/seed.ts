import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Schedule } from '../models/Schedule.js';
import { Appointment } from '../models/Appointment.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Dependent } from '../models/Dependent.js';
import { Notification } from '../models/Notification.js';

const hashPassword = async (pass: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pass, salt);
};

export const seedDatabase = async () => {
  console.log('🌱 Starting SmartQueue Database Seeding...');
  await connectDatabase();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Department.deleteMany({}),
    DoctorProfile.deleteMany({}),
    Schedule.deleteMany({}),
    Appointment.deleteMany({}),
    QueueEntry.deleteMany({}),
    Dependent.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('🧹 Cleaned existing database collections');

  // 1. Create Hospital
  const hospital = await Hospital.create({
    name: 'Metro Health Multispecialty Hospital',
    slug: 'metro-health',
    address: {
      street: '100 Healthcare Boulevard, Tech City',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560100',
      country: 'India',
    },
    phone: '+91 80 4912 3000',
    email: 'contact@metrohealth.test',
    timezone: 'Asia/Kolkata',
    settings: {
      cancellationWindowHours: 2,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      defaultSlotDurationMinutes: 15,
      gracePeriodMinutes: 30,
    },
    isActive: true,
  });

  console.log(`🏥 Created Hospital: ${hospital.name}`);

  // 2. Create 5 Departments
  const departmentsData = [
    {
      name: 'Cardiology',
      code: 'CAR',
      description: 'Comprehensive cardiac care, diagnostics, and intervention.',
      rooms: [
        { name: 'Cardio OPD 1', number: '101', isActive: true },
        { name: 'Cardio OPD 2', number: '102', isActive: true },
      ],
    },
    {
      name: 'Orthopedics',
      code: 'ORT',
      description: 'Bones, joints, spine, and sports medicine consultations.',
      rooms: [
        { name: 'Ortho Clinic 1', number: '201', isActive: true },
        { name: 'Ortho Clinic 2', number: '202', isActive: true },
      ],
    },
    {
      name: 'General Medicine',
      code: 'GEN',
      description: 'Primary healthcare, chronic disease management, and internal medicine.',
      rooms: [
        { name: 'Med OPD 1', number: '301', isActive: true },
        { name: 'Med OPD 2', number: '302', isActive: true },
      ],
    },
    {
      name: 'Pediatrics',
      code: 'PED',
      description: 'Newborn, infant, child, and adolescent healthcare and immunization.',
      rooms: [{ name: 'Child Care OPD', number: '401', isActive: true }],
    },
    {
      name: 'Dermatology',
      code: 'DER',
      description: 'Clinical and cosmetic skin, hair, and nail treatments.',
      rooms: [{ name: 'Derma Suite', number: '501', isActive: true }],
    },
  ];

  const departments = await Department.insertMany(
    departmentsData.map((d) => ({ ...d, hospitalId: hospital._id, isActive: true }))
  );
  console.log(`🏢 Created ${departments.length} Departments`);

  const deptMap: Record<string, any> = {};
  departments.forEach((d) => {
    deptMap[d.code] = d;
  });

  // 3. Create Staff Accounts: Hospital Admin & 2 Receptionists
  const adminPassword = await hashPassword('Admin@123');
  const receptionistPassword = await hashPassword('Receptionist@123');

  await User.create({
    name: 'Dr. Arthur Mitchell',
    email: 'admin@smartqueue.test',
    passwordHash: adminPassword,
    role: 'hospital_admin',
    hospitalId: hospital._id,
    phone: '+91 98765 00001',
    isEmailVerified: true,
    isActive: true,
  });

  await User.insertMany([
    {
      name: 'Sarah Jenkins',
      email: 'receptionist1@smartqueue.test',
      passwordHash: receptionistPassword,
      role: 'receptionist',
      hospitalId: hospital._id,
      phone: '+91 98765 00002',
      isEmailVerified: true,
      isActive: true,
    },
    {
      name: 'Michael Chang',
      email: 'receptionist2@smartqueue.test',
      passwordHash: receptionistPassword,
      role: 'receptionist',
      hospitalId: hospital._id,
      phone: '+91 98765 00003',
      isEmailVerified: true,
      isActive: true,
    },
  ]);
  console.log('👤 Created Admin and 2 Receptionists');

  // 4. Create 10 Doctors with Profiles & Schedules
  const doctorPassword = await hashPassword('Doctor@123');
  const doctorSpecs = [
    { name: 'Dr. Rajesh Rao', dept: 'CAR', spec: 'Interventional Cardiologist', fee: 800, exp: 14, room: '101' },
    { name: 'Dr. Elena Rostova', dept: 'CAR', spec: 'Electrophysiologist', fee: 900, exp: 11, room: '102' },
    { name: 'Dr. Vikram Sethi', dept: 'ORT', spec: 'Joint Replacement & Spine', fee: 750, exp: 16, room: '201' },
    { name: 'Dr. Ananya Sharma', dept: 'ORT', spec: 'Sports Medicine & Arthroscopy', fee: 650, exp: 8, room: '202' },
    { name: 'Dr. Priya Sundaram', dept: 'GEN', spec: 'Internal Medicine Specialist', fee: 500, exp: 12, room: '301' },
    { name: 'Dr. David Miller', dept: 'GEN', spec: 'Senior Consultant Physician', fee: 550, exp: 18, room: '302' },
    { name: 'Dr. Aisha Khan', dept: 'PED', spec: 'Pediatrician & Neonatologist', fee: 600, exp: 9, room: '401' },
    { name: 'Dr. Sanjay Verma', dept: 'PED', spec: 'Adolescent Medicine Specialist', fee: 600, exp: 7, room: '401' },
    { name: 'Dr. Maya Patel', dept: 'DER', spec: 'Consultant Dermatologist', fee: 700, exp: 10, room: '501' },
    { name: 'Dr. Robert Chen', dept: 'DER', spec: 'Trichologist & Dermatosurgeon', fee: 850, exp: 13, room: '501' },
  ];

  const doctorProfiles: any[] = [];

  for (let i = 0; i < doctorSpecs.length; i++) {
    const ds = doctorSpecs[i];
    const email = `doctor${i + 1}@smartqueue.test`;
    const docUser = await User.create({
      name: ds.name,
      email,
      passwordHash: doctorPassword,
      role: 'doctor',
      hospitalId: hospital._id,
      phone: `+91 98765 1000${i}`,
      isEmailVerified: true,
      isActive: true,
      avatarUrl: `https://images.unsplash.com/photo-${1559839734 + i}?w=150&auto=format&fit=crop&q=80`,
    });

    const docProfile = await DoctorProfile.create({
      userId: docUser._id,
      hospitalId: hospital._id,
      departmentId: deptMap[ds.dept]._id,
      specialization: ds.spec,
      qualifications: ['MBBS', 'MD', 'DNB', 'Fellowship'],
      experienceYears: ds.exp,
      consultationFee: ds.fee,
      avgConsultationMinutes: 15,
      roomNumber: ds.room,
      bio: `Dedicated ${ds.spec} with over ${ds.exp} years of clinical expertise providing compassionate care.`,
      photoUrl: docUser.avatarUrl,
      isActive: true,
    });

    // Schedule: Mon - Sat, 09:00 - 13:00 and 14:00 - 18:00
    const weeklyHours = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      shifts: [
        { startTime: '09:00', endTime: '13:00' },
        { startTime: '14:00', endTime: '18:00' },
      ],
      slotDurationMinutes: 15,
    }));

    await Schedule.create({
      doctorProfileId: docProfile._id,
      hospitalId: hospital._id,
      weeklyHours,
      leaveBlocks: [],
    });

    doctorProfiles.push(docProfile);
  }
  console.log(`🩺 Created ${doctorProfiles.length} Doctors with Weekly Schedules`);

  // 5. Create 15 Patients & Dependents
  const patientPassword = await hashPassword('Patient@123');
  const patientNames = [
    'John Doe', 'Jane Smith', 'Ramesh Kumar', 'Sunita Reddy', 'Kavita Iyer',
    'Arjun Nair', 'Fatima Zahra', 'Carlos Gomez', 'Emily Watson', 'Deepak Verma',
    'Anita Roy', 'Mohammad Ali', 'Sneha Pillai', 'Lucas Brown', 'Meera Joshi',
  ];

  const patients: any[] = [];
  for (let i = 0; i < patientNames.length; i++) {
    const patientUser = await User.create({
      name: patientNames[i],
      email: `patient${i + 1}@smartqueue.test`,
      passwordHash: patientPassword,
      role: 'patient',
      phone: `+91 98111 200${String(i).padStart(2, '0')}`,
      isEmailVerified: true,
      isActive: true,
    });
    patients.push(patientUser);

    if (i < 5) {
      await Dependent.create({
        patientId: patientUser._id,
        name: `${patientUser.name.split(' ')[0]} Junior`,
        relationship: 'child',
        dateOfBirth: new Date('2018-05-12'),
        gender: i % 2 === 0 ? 'male' : 'female',
        phone: patientUser.phone,
        bloodGroup: 'O+',
      });
      await Dependent.create({
        patientId: patientUser._id,
        name: `Elder ${patientUser.name.split(' ')[1] || 'Family'}`,
        relationship: 'parent',
        dateOfBirth: new Date('1956-08-20'),
        gender: 'female',
        bloodGroup: 'B+',
      });
    }
  }
  console.log(`👨‍👩‍👧 Created ${patients.length} Patients with Dependents`);

  // 6. Create ~60 Appointments across Past, Today, and Future
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 2);
  const pastDateStr = pastDate.toISOString().slice(0, 10);

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 2);
  const futureDateStr = futureDate.toISOString().slice(0, 10);

  const timeSlots = [
    '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45', '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
  ];

  let aptCount = 0;

  // Past appointments (20 distinct)
  for (let i = 0; i < 20; i++) {
    const doc = doctorProfiles[i % 5];
    const slotIdx = Math.floor(i / 5);
    const time = timeSlots[slotIdx];
    const patient = patients[i % patients.length];
    const [h, m] = time.split(':').map(Number);
    const endTime = `${String(h).padStart(2, '0')}:${String(m + 15).padStart(2, '0')}`;
    const [py, pm, pd] = pastDateStr.split('-').map(Number);

    const apt = await Appointment.create({
      appointmentNumber: `APT-P-${1000 + i}`,
      hospitalId: hospital._id,
      departmentId: doc.departmentId,
      doctorId: doc._id,
      patientId: patient._id,
      date: pastDateStr,
      startTime: time,
      endTime,
      slotTime: new Date(Date.UTC(py, pm - 1, pd, h, m)),
      status: i % 5 === 0 ? 'no_show' : 'completed',
      visitType: 'new',
      symptoms: 'Past consultation visit',
      paymentStatus: 'paid',
      consultationFee: doc.consultationFee,
    });
    aptCount++;

    if (apt.status === 'completed') {
      await QueueEntry.create({
        hospitalId: hospital._id,
        departmentId: doc.departmentId,
        doctorId: doc._id,
        appointmentId: apt._id,
        patientId: patient._id,
        tokenNumber: `GEN-${String(i + 1).padStart(3, '0')}`,
        date: pastDateStr,
        sequenceNumber: i + 1,
        priority: 'normal',
        status: 'completed',
        checkInTime: new Date(Date.UTC(py, pm - 1, pd, h, m - 10)),
        startTime: new Date(Date.UTC(py, pm - 1, pd, h, m)),
        endTime: new Date(Date.UTC(py, pm - 1, pd, h, m + 14)),
        estimatedWaitMinutes: 0,
        roomNumber: doc.roomNumber,
      });
    }
  }

  // Today's appointments (24 distinct slots across 4 doctors)
  let todayIndex = 0;
  for (let d = 0; d < 4; d++) {
    const doc = doctorProfiles[d];
    for (let s = 0; s < 6; s++) {
      const time = timeSlots[s];
      const patient = patients[todayIndex % patients.length];
      const [h, m] = time.split(':').map(Number);
      const endTime = `${String(h).padStart(2, '0')}:${String(m + 15).padStart(2, '0')}`;
      const [ty, tm, td] = todayStr.split('-').map(Number);

      let status: any = 'checked_in';
      let qStatus: any = 'waiting';

      if (s === 0) {
        status = 'completed';
        qStatus = 'completed';
      } else if (s === 1) {
        status = 'in_consultation';
        qStatus = 'in_consultation';
      } else if (s === 2) {
        status = 'checked_in';
        qStatus = 'called';
      } else if (s > 4) {
        status = 'booked';
      }

      const apt = await Appointment.create({
        appointmentNumber: `APT-T-${2000 + todayIndex}`,
        hospitalId: hospital._id,
        departmentId: doc.departmentId,
        doctorId: doc._id,
        patientId: patient._id,
        date: todayStr,
        startTime: time,
        endTime,
        slotTime: new Date(Date.UTC(ty, tm - 1, td, h, m)),
        status,
        visitType: s % 2 === 0 ? 'follow_up' : 'new',
        symptoms: 'Routine checkup and clinical examination',
        paymentStatus: s < 4 ? 'paid' : 'pending',
        consultationFee: doc.consultationFee,
      });
      aptCount++;

      if (status !== 'booked') {
        const priority = s === 3 ? 'emergency' : s === 4 ? 'senior_disabled' : 'normal';
        await QueueEntry.create({
          hospitalId: hospital._id,
          departmentId: doc.departmentId,
          doctorId: doc._id,
          appointmentId: apt._id,
          patientId: patient._id,
          tokenNumber: `${doc.roomNumber === '101' ? 'CAR' : doc.roomNumber === '102' ? 'CAR' : 'ORT'}-${String(todayIndex + 1).padStart(3, '0')}`,
          date: todayStr,
          sequenceNumber: s + 1,
          priority,
          status: qStatus,
          checkInTime: new Date(Date.UTC(ty, tm - 1, td, 8, 30 + s * 10)),
          estimatedWaitMinutes: qStatus === 'waiting' ? (s - 1) * 15 : 0,
          roomNumber: doc.roomNumber,
          queueHistory: [
            { action: 'CHECKED_IN', timestamp: new Date(), note: `Priority: ${priority}` },
          ],
        });
      }

      todayIndex++;
    }
  }

  // Future appointments (20 distinct slots)
  for (let i = 0; i < 20; i++) {
    const doc = doctorProfiles[i % 5];
    const slotIdx = Math.floor(i / 5) + 6;
    const time = timeSlots[slotIdx];
    const patient = patients[i % patients.length];
    const [h, m] = time.split(':').map(Number);
    const endTime = `${String(h).padStart(2, '0')}:${String(m + 15).padStart(2, '0')}`;
    const [fy, fm, fd] = futureDateStr.split('-').map(Number);

    await Appointment.create({
      appointmentNumber: `APT-F-${3000 + i}`,
      hospitalId: hospital._id,
      departmentId: doc.departmentId,
      doctorId: doc._id,
      patientId: patient._id,
      date: futureDateStr,
      startTime: time,
      endTime,
      slotTime: new Date(Date.UTC(fy, fm - 1, fd, h, m)),
      status: 'booked',
      visitType: 'new',
      symptoms: 'Future consultation booking',
      paymentStatus: 'pending',
      consultationFee: doc.consultationFee,
    });
    aptCount++;
  }

  console.log(`📅 Created ${aptCount} Appointments & Real-Time Queue Entries`);

  console.log('\n======================================================');
  console.log('🎉 SMARTQUEUE SEEDING COMPLETE! DEMO ACCOUNTS READY:');
  console.log('======================================================');
  console.log('1. Super / Hospital Admin:');
  console.log('   Email:    admin@smartqueue.test');
  console.log('   Password: Admin@123\n');
  console.log('2. Receptionist:');
  console.log('   Email:    receptionist1@smartqueue.test');
  console.log('   Password: Receptionist@123\n');
  console.log('3. Doctor (Cardiologist, Room 101):');
  console.log('   Email:    doctor1@smartqueue.test');
  console.log('   Password: Doctor@123\n');
  console.log('4. Patient:');
  console.log('   Email:    patient1@smartqueue.test');
  console.log('   Password: Patient@123');
  console.log('======================================================\n');

  await disconnectDatabase();
};

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
