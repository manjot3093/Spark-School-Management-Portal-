const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config.env') });

const School = require('../models/School');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const FeeCategory = require('../models/FeeCategory');
const Exam = require('../models/Exam');
const { syncToFirebase } = require('../utils/firebaseUtils');

async function seed() {
  try {
    console.log('🌱 Starting Demo Data Seeder...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Get or Create School & Admin
    let admin = await User.findOne({ email: 'admin@masterportal.com' });
    if (!admin) {
      admin = await User.create({
        name: 'System Administrator',
        email: 'admin@masterportal.com',
        password: 'admin123',
        role: 'school_admin',
        isActive: true,
      });
    }

    let school = await School.findOne({ code: 'SPARK01' });
    if (!school) {
      school = await School.create({
        name: 'Spark International School',
        code: 'SPARK01',
        address: 'Main Campus, Spark Education City',
        contact: 'admin@sparkschool.edu',
        status: 'active',
        plan: 'premium',
        createdBy: admin._id,
      });
    }

    admin.schoolId = school._id;
    admin.role = 'school_admin';
    await admin.save();
    console.log(`🏫 School: ${school.name} (${school._id})`);

    // 2. Teachers
    const teachersData = [
      { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@spark.edu', phone: '+919876543210' },
      { name: 'Mr. Michael Brown', email: 'michael.brown@spark.edu', phone: '+919876543211' },
      { name: 'Ms. Emily Davis', email: 'emily.davis@spark.edu', phone: '+919876543212' },
      { name: 'Mr. Rajesh Kumar', email: 'rajesh.kumar@spark.edu', phone: '+919876543213' },
      { name: 'Ms. Priya Sharma', email: 'priya.sharma@spark.edu', phone: '+919876543214' },
    ];

    const teacherDocs = [];
    for (const t of teachersData) {
      let teacher = await User.findOne({ email: t.email });
      if (!teacher) {
        teacher = await User.create({
          name: t.name,
          email: t.email,
          phone: t.phone,
          password: 'Teacher@123',
          role: 'teacher',
          schoolId: school._id,
          isActive: true,
        });
        try {
          await syncToFirebase(t.email, 'Teacher@123', t.name, true);
        } catch (e) {
          // ignore
        }
        console.log(`  ➕ Teacher created: ${t.name}`);
      } else {
        console.log(`  ✓ Teacher exists: ${t.name}`);
      }
      teacherDocs.push(teacher);
    }

    // 3. Classes
    const classesData = [
      { name: 'Class 10', section: 'A', room: 'Room 201', capacity: 40, teacherId: teacherDocs[0]._id },
      { name: 'Class 10', section: 'B', room: 'Room 202', capacity: 40, teacherId: teacherDocs[1]._id },
      { name: 'Class 9', section: 'A', room: 'Room 101', capacity: 40, teacherId: teacherDocs[2]._id },
      { name: 'Class 9', section: 'B', room: 'Room 102', capacity: 40, teacherId: teacherDocs[3]._id },
    ];

    const classDocs = [];
    for (const c of classesData) {
      let cls = await Class.findOne({ schoolId: school._id, name: c.name, section: c.section });
      if (!cls) {
        cls = await Class.create({
          ...c,
          schoolId: school._id,
          academicYear: '2026',
          createdBy: admin._id,
        });
        console.log(`  ➕ Class created: ${cls.name}-${cls.section}`);
      } else {
        console.log(`  ✓ Class exists: ${cls.name}-${cls.section}`);
      }
      classDocs.push(cls);
    }

    // 4. Subjects
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH10', type: 'core', teacher: teacherDocs[0], cls: classDocs[0] },
      { name: 'Science', code: 'SCI10', type: 'core', teacher: teacherDocs[1], cls: classDocs[0] },
      { name: 'English', code: 'ENG10', type: 'core', teacher: teacherDocs[2], cls: classDocs[0] },
      { name: 'Computer Science', code: 'CS10', type: 'elective', teacher: teacherDocs[3], cls: classDocs[0] },
      { name: 'Social Studies', code: 'SOC10', type: 'core', teacher: teacherDocs[4], cls: classDocs[1] },
      { name: 'Mathematics', code: 'MATH09', type: 'core', teacher: teacherDocs[0], cls: classDocs[2] },
      { name: 'Science', code: 'SCI09', type: 'core', teacher: teacherDocs[1], cls: classDocs[2] },
      { name: 'English', code: 'ENG09', type: 'core', teacher: teacherDocs[2], cls: classDocs[3] },
    ];

    const subjectDocs = [];
    for (const s of subjectsData) {
      let sub = await Subject.findOne({ schoolId: school._id, code: s.code, classId: s.cls._id });
      if (!sub) {
        sub = await Subject.create({
          name: s.name,
          code: s.code,
          type: s.type,
          teacherId: s.teacher._id,
          schoolId: school._id,
          classId: s.cls._id,
          createdBy: admin._id,
        });
        console.log(`  ➕ Subject created: ${sub.name} (${sub.code})`);
      } else {
        console.log(`  ✓ Subject exists: ${sub.name} (${sub.code})`);
      }
      subjectDocs.push(sub);
    }

    // Link subjects to classes
    for (const cls of classDocs) {
      const classSubjects = subjectDocs.filter(s => s.classId.toString() === cls._id.toString());
      if (classSubjects.length > 0) {
        cls.subjects = classSubjects.map(s => s._id);
        await cls.save();
      }
    }

    // 5. Students
    const studentsData = [
      { name: 'Aarav Patel', email: 'aarav.patel@sparkstudent.com', rollNumber: '1001', admissionNumber: 'ADM2026001', gender: 'male', dob: '2010-04-12', classIndex: 0 },
      { name: 'Diya Sharma', email: 'diya.sharma@sparkstudent.com', rollNumber: '1002', admissionNumber: 'ADM2026002', gender: 'female', dob: '2010-08-25', classIndex: 0 },
      { name: 'Rohan Gupta', email: 'rohan.gupta@sparkstudent.com', rollNumber: '1003', admissionNumber: 'ADM2026003', gender: 'male', dob: '2010-01-19', classIndex: 0 },
      { name: 'Ananya Verma', email: 'ananya.verma@sparkstudent.com', rollNumber: '1004', admissionNumber: 'ADM2026004', gender: 'female', dob: '2010-11-05', classIndex: 1 },
      { name: 'Vihaan Singh', email: 'vihaan.singh@sparkstudent.com', rollNumber: '1005', admissionNumber: 'ADM2026005', gender: 'male', dob: '2010-06-30', classIndex: 1 },
      { name: 'Ishita Joshi', email: 'ishita.joshi@sparkstudent.com', rollNumber: '9001', admissionNumber: 'ADM2026006', gender: 'female', dob: '2011-03-14', classIndex: 2 },
      { name: 'Kabir Mehta', email: 'kabir.mehta@sparkstudent.com', rollNumber: '9002', admissionNumber: 'ADM2026007', gender: 'male', dob: '2011-09-21', classIndex: 2 },
      { name: 'Riya Nair', email: 'riya.nair@sparkstudent.com', rollNumber: '9003', admissionNumber: 'ADM2026008', gender: 'female', dob: '2011-12-08', classIndex: 3 },
      { name: 'Aryan Reddy', email: 'aryan.reddy@sparkstudent.com', rollNumber: '9004', admissionNumber: 'ADM2026009', gender: 'male', dob: '2011-07-17', classIndex: 3 },
      { name: 'Sneha Roy', email: 'sneha.roy@sparkstudent.com', rollNumber: '9005', admissionNumber: 'ADM2026010', gender: 'female', dob: '2011-05-02', classIndex: 3 },
    ];

    for (const st of studentsData) {
      let student = await Student.findOne({ schoolId: school._id, admissionNumber: st.admissionNumber });
      if (!student) {
        student = await Student.create({
          name: st.name,
          email: st.email,
          password: 'Student@123',
          rollNumber: st.rollNumber,
          admissionNumber: st.admissionNumber,
          gender: st.gender,
          dateOfBirth: new Date(st.dob),
          admissionDate: new Date('2026-04-01'),
          schoolId: school._id,
          classId: classDocs[st.classIndex]._id,
          status: 'active',
          address: {
            street: '123 Education Lane',
            city: 'Spark City',
            state: 'State',
            zipCode: '110001',
            country: 'India',
          },
          phone: '+919812345678',
        });
        console.log(`  ➕ Student created: ${student.name} (Roll: ${student.rollNumber})`);
      } else {
        console.log(`  ✓ Student exists: ${student.name}`);
      }
    }

    // 6. Fee Categories
    const feeCategories = [
      { name: 'Tuition Fee - Term 1', description: 'Academic tuition for Term 1', chargeType: 'recurring' },
      { name: 'Laboratory & Science Fee', description: 'Access to physics and chemistry labs', chargeType: 'one_time' },
      { name: 'Library & Digital Resources', description: 'Library card and e-learning resources', chargeType: 'one_time' },
      { name: 'Sports & Extracurricular Activities', description: 'Sports facilities and annual games', chargeType: 'recurring' },
    ];

    for (const fc of feeCategories) {
      let fee = await FeeCategory.findOne({ school: school._id, name: fc.name });
      if (!fee) {
        await FeeCategory.create({
          school: school._id,
          name: fc.name,
          description: fc.description,
          chargeType: fc.chargeType,
          createdBy: admin._id,
        });
        console.log(`  ➕ Fee Category created: ${fc.name}`);
      } else {
        console.log(`  ✓ Fee Category exists: ${fc.name}`);
      }
    }

    // 7. Exams
    const examData = [
      { name: 'Term 1 Mid-Term Examination', examType: 'Mid Term', classId: classDocs[0]._id, subjectId: subjectDocs[0]._id },
      { name: 'Unit Test 1 - Physics & Chem', examType: 'Unit Test', classId: classDocs[0]._id, subjectId: subjectDocs[1]._id },
      { name: 'Quarterly English Assessment', examType: 'Unit Test', classId: classDocs[2]._id, subjectId: subjectDocs[2]._id },
    ];

    for (const ex of examData) {
      let exam = await Exam.findOne({ schoolId: school._id, name: ex.name });
      if (!exam) {
        await Exam.create({
          name: ex.name,
          examType: ex.examType,
          schoolId: school._id,
          classId: ex.classId,
          subjectId: ex.subjectId,
          startDate: new Date('2026-10-15'),
          endDate: new Date('2026-10-15'),
          examDate: new Date('2026-10-15'),
          examTime: '09:00 AM',
          duration: 180,
          totalMarks: 100,
          passingMarks: 35,
          status: 'upcoming',
          createdBy: admin._id,
        });
        console.log(`  ➕ Exam created: ${ex.name}`);
      } else {
        console.log(`  ✓ Exam exists: ${ex.name}`);
      }
    }

    // Update School counts
    const totalStudents = await Student.countDocuments({ schoolId: school._id, status: 'active' });
    const totalTeachers = await User.countDocuments({ schoolId: school._id, role: 'teacher' });
    school.students = totalStudents;
    school.teachers = totalTeachers;
    await school.save();

    console.log('\n🎉 Demo Data Seeded Successfully!');
    console.log(`📊 Summary for ${school.name}:`);
    console.log(`   - Teachers: ${totalTeachers}`);
    console.log(`   - Classes: ${classDocs.length}`);
    console.log(`   - Subjects: ${subjectDocs.length}`);
    console.log(`   - Students: ${totalStudents}`);
    console.log(`   - Fee Categories: ${feeCategories.length}`);
    console.log(`   - Exams: ${examData.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
