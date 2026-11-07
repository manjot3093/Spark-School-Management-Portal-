/**
 * Comprehensive Master Demo Data Seeder for Spark ERP
 * Seeds realistic, rich data across all school portal modules and dashboard widgets.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config.env') });

// Import all required models
const School = require('../models/School');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const House = require('../models/House');
const Attendance = require('../models/Attendance');
const TeacherAttendance = require('../models/TeacherAttendance');
const FeeCategory = require('../models/FeeCategory');
const FeeStructure = require('../models/FeeStructure');
const FeeCollection = require('../models/FeeCollection');
const FeeReceipt = require('../models/FeeReceipt');
const Salary = require('../models/Salary');
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const QuestionPaper = require('../models/QuestionPaper');
const ImportantDate = require('../models/ImportantDate');
const Announcement = require('../models/Announcement');
const Book = require('../models/Book');
const BookBorrowing = require('../models/BookBorrowing');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const StudentTransport = require('../models/StudentTransport');
const InventoryItem = require('../models/InventoryItem');
const AdmissionApplication = require('../models/AdmissionApplication');
const Assignment = require('../models/Assignment');
const Syllabus = require('../models/Syllabus');
const SchoolProduct = require('../models/SchoolProduct');
const Notification = require('../models/Notification');
const IDCard = require('../models/IDCard');
const Note = require('../models/Note');

async function seedMasterData() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully to MongoDB Atlas!\n');

    // ==========================================
    // 1. SCHOOL & ADMIN
    // ==========================================
    console.log('🏫 Checking School & Admin...');
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
    console.log(`   School: ${school.name} (ID: ${school._id})`);

    // ==========================================
    // 2. TEACHERS & EMPLOYEES
    // ==========================================
    console.log('\n👩‍🏫 Seeding Teachers & Staff...');
    const staffList = [
      { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@spark.edu', phone: '+919876543210', role: 'teacher', designation: 'Head of Mathematics', basicSalary: 5500 },
      { name: 'Mr. Michael Brown', email: 'michael.brown@spark.edu', phone: '+919876543211', role: 'teacher', designation: 'Senior Science Teacher', basicSalary: 4800 },
      { name: 'Ms. Emily Davis', email: 'emily.davis@spark.edu', phone: '+919876543212', role: 'teacher', designation: 'English Literature Faculty', basicSalary: 4600 },
      { name: 'Mr. Rajesh Kumar', email: 'rajesh.kumar@spark.edu', phone: '+919876543213', role: 'teacher', designation: 'Computer Science & AI Instructor', basicSalary: 5200 },
      { name: 'Ms. Priya Sharma', email: 'priya.sharma@spark.edu', phone: '+919876543214', role: 'teacher', designation: 'Social Sciences Coordinator', basicSalary: 4500 },
      { name: 'Mr. Vikram Malhotra', email: 'vikram.malhotra@spark.edu', phone: '+919876543215', role: 'teacher', designation: 'Physical Education Director', basicSalary: 4200 },
      { name: 'Ms. Anjali Rao', email: 'anjali.rao@spark.edu', phone: '+919876543216', role: 'teacher', designation: 'Biology & Environmental Studies', basicSalary: 4700 },
      { name: 'Mr. Matt Henry', email: 'matt@gmail.com', phone: '+919876543217', role: 'librarian', designation: 'Chief Librarian', basicSalary: 3800 },
      { name: 'Mrs. Sunita Verma', email: 'sunita.verma@spark.edu', phone: '+919876543218', role: 'accountant', designation: 'Senior Accountant & Bursar', basicSalary: 4400 },
    ];

    const teacherDocs = [];
    for (const st of staffList) {
      let user = await User.findOne({ email: st.email });
      if (!user) {
        user = await User.create({
          name: st.name,
          email: st.email,
          phone: st.phone,
          password: 'Password@123',
          role: st.role,
          schoolId: school._id,
          isActive: true,
        });
      }
      teacherDocs.push({ user, info: st });
    }
    console.log(`   Seeded/verified ${teacherDocs.length} teachers & staff members.`);

    // ==========================================
    // 3. CLASSES
    // ==========================================
    console.log('\n🏫 Seeding Classes...');
    const classList = [
      { name: 'Class 10', section: 'A', room: 'Room 301', capacity: 40, teacherId: teacherDocs[0].user._id },
      { name: 'Class 10', section: 'B', room: 'Room 302', capacity: 40, teacherId: teacherDocs[1].user._id },
      { name: 'Class 9', section: 'A', room: 'Room 201', capacity: 40, teacherId: teacherDocs[2].user._id },
      { name: 'Class 9', section: 'B', room: 'Room 202', capacity: 40, teacherId: teacherDocs[3].user._id },
      { name: 'Class 8', section: 'A', room: 'Room 101', capacity: 40, teacherId: teacherDocs[4].user._id },
      { name: 'Class 11', section: 'Science', room: 'Room 401', capacity: 35, teacherId: teacherDocs[6].user._id },
    ];

    const classDocs = [];
    for (const c of classList) {
      let cls = await Class.findOne({ schoolId: school._id, name: c.name, section: c.section });
      if (!cls) {
        cls = await Class.create({
          ...c,
          schoolId: school._id,
          academicYear: '2026',
          createdBy: admin._id,
        });
      }
      classDocs.push(cls);
    }
    console.log(`   Seeded/verified ${classDocs.length} classes.`);

    // ==========================================
    // 4. SUBJECTS
    // ==========================================
    console.log('\n📚 Seeding Subjects...');
    const subjectList = [
      { name: 'Mathematics', code: 'MATH10', type: 'core', teacher: teacherDocs[0].user, cls: classDocs[0] },
      { name: 'Science', code: 'SCI10', type: 'core', teacher: teacherDocs[1].user, cls: classDocs[0] },
      { name: 'English Literature', code: 'ENG10', type: 'core', teacher: teacherDocs[2].user, cls: classDocs[0] },
      { name: 'Computer Science', code: 'CS10', type: 'elective', teacher: teacherDocs[3].user, cls: classDocs[0] },
      { name: 'Social Studies', code: 'SOC10', type: 'core', teacher: teacherDocs[4].user, cls: classDocs[0] },
      { name: 'Mathematics', code: 'MATH09', type: 'core', teacher: teacherDocs[0].user, cls: classDocs[2] },
      { name: 'Science', code: 'SCI09', type: 'core', teacher: teacherDocs[1].user, cls: classDocs[2] },
      { name: 'English Language', code: 'ENG09', type: 'core', teacher: teacherDocs[2].user, cls: classDocs[2] },
      { name: 'Computer Applications', code: 'CS09', type: 'elective', teacher: teacherDocs[3].user, cls: classDocs[2] },
      { name: 'Physics', code: 'PHY11', type: 'core', teacher: teacherDocs[1].user, cls: classDocs[5] },
      { name: 'Biology', code: 'BIO11', type: 'core', teacher: teacherDocs[6].user, cls: classDocs[5] },
    ];

    const subjectDocs = [];
    for (const s of subjectList) {
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
      }
      subjectDocs.push(sub);
    }

    for (const cls of classDocs) {
      const classSubjects = subjectDocs.filter(s => s.classId.toString() === cls._id.toString());
      if (classSubjects.length > 0) {
        cls.subjects = classSubjects.map(s => s._id);
        await cls.save();
      }
    }
    console.log(`   Seeded/verified ${subjectDocs.length} subjects.`);

    // ==========================================
    // 5. STUDENTS
    // ==========================================
    console.log('\n🎒 Seeding Students...');
    const studentsData = [
      // Class 10 - A (Index 0)
      { name: 'Aarav Patel', email: 'aarav.patel@sparkstudent.com', rollNumber: '1001', admissionNumber: 'ADM2026001', gender: 'male', dob: '2010-04-12', classIndex: 0 },
      { name: 'Diya Sharma', email: 'diya.sharma@sparkstudent.com', rollNumber: '1002', admissionNumber: 'ADM2026002', gender: 'female', dob: '2010-08-25', classIndex: 0 },
      { name: 'Rohan Gupta', email: 'rohan.gupta@sparkstudent.com', rollNumber: '1003', admissionNumber: 'ADM2026003', gender: 'male', dob: '2010-01-19', classIndex: 0 },
      { name: 'Ananya Verma', email: 'ananya.verma@sparkstudent.com', rollNumber: '1004', admissionNumber: 'ADM2026004', gender: 'female', dob: '2010-11-05', classIndex: 0 },
      { name: 'Vihaan Singh', email: 'vihaan.singh@sparkstudent.com', rollNumber: '1005', admissionNumber: 'ADM2026005', gender: 'male', dob: '2010-06-30', classIndex: 0 },
      { name: 'Meera Iyer', email: 'meera.iyer@sparkstudent.com', rollNumber: '1006', admissionNumber: 'ADM2026006', gender: 'female', dob: '2010-03-22', classIndex: 0 },
      { name: 'Arjun Nair', email: 'arjun.nair@sparkstudent.com', rollNumber: '1007', admissionNumber: 'ADM2026007', gender: 'male', dob: '2010-07-14', classIndex: 0 },
      { name: 'Kavya Pillai', email: 'kavya.pillai@sparkstudent.com', rollNumber: '1008', admissionNumber: 'ADM2026008', gender: 'female', dob: '2010-09-09', classIndex: 0 },
      // Class 10 - B (Index 1)
      { name: 'Ishaan Deshmukh', email: 'ishaan.deshmukh@sparkstudent.com', rollNumber: '1051', admissionNumber: 'ADM2026009', gender: 'male', dob: '2010-05-18', classIndex: 1 },
      { name: 'Pooja Agarwal', email: 'pooja.agarwal@sparkstudent.com', rollNumber: '1052', admissionNumber: 'ADM2026010', gender: 'female', dob: '2010-10-11', classIndex: 1 },
      { name: 'Aditya Chawla', email: 'aditya.chawla@sparkstudent.com', rollNumber: '1053', admissionNumber: 'ADM2026011', gender: 'male', dob: '2010-02-27', classIndex: 1 },
      { name: 'Sanya Kapoor', email: 'sanya.kapoor@sparkstudent.com', rollNumber: '1054', admissionNumber: 'ADM2026012', gender: 'female', dob: '2010-12-04', classIndex: 1 },
      // Class 9 - A (Index 2)
      { name: 'Ishita Joshi', email: 'ishita.joshi@sparkstudent.com', rollNumber: '9001', admissionNumber: 'ADM2026013', gender: 'female', dob: '2011-03-14', classIndex: 2 },
      { name: 'Kabir Mehta', email: 'kabir.mehta@sparkstudent.com', rollNumber: '9002', admissionNumber: 'ADM2026014', gender: 'male', dob: '2011-09-21', classIndex: 2 },
      { name: 'Riya Sen', email: 'riya.sen@sparkstudent.com', rollNumber: '9003', admissionNumber: 'ADM2026015', gender: 'female', dob: '2011-12-08', classIndex: 2 },
      { name: 'Aryan Reddy', email: 'aryan.reddy@sparkstudent.com', rollNumber: '9004', admissionNumber: 'ADM2026016', gender: 'male', dob: '2011-07-17', classIndex: 2 },
      // Class 9 - B (Index 3)
      { name: 'Sneha Roy', email: 'sneha.roy@sparkstudent.com', rollNumber: '9051', admissionNumber: 'ADM2026017', gender: 'female', dob: '2011-05-02', classIndex: 3 },
      { name: 'Dev Malik', email: 'dev.malik@sparkstudent.com', rollNumber: '9052', admissionNumber: 'ADM2026018', gender: 'male', dob: '2011-08-16', classIndex: 3 },
      { name: 'Tanvi Bhatia', email: 'tanvi.bhatia@sparkstudent.com', rollNumber: '9053', admissionNumber: 'ADM2026019', gender: 'female', dob: '2011-11-23', classIndex: 3 },
      // Class 8 - A (Index 4)
      { name: 'Pranav Rao', email: 'pranav.rao@sparkstudent.com', rollNumber: '8001', admissionNumber: 'ADM2026020', gender: 'male', dob: '2012-01-30', classIndex: 4 },
      { name: 'Anika Saxena', email: 'anika.saxena@sparkstudent.com', rollNumber: '8002', admissionNumber: 'ADM2026021', gender: 'female', dob: '2012-06-15', classIndex: 4 },
      // Class 11 - Science (Index 5)
      { name: 'Siddharth Varma', email: 'siddharth.varma@sparkstudent.com', rollNumber: '1101', admissionNumber: 'ADM2026022', gender: 'male', dob: '2009-04-10', classIndex: 5 },
      { name: 'Neha Nambiar', email: 'neha.nambiar@sparkstudent.com', rollNumber: '1102', admissionNumber: 'ADM2026023', gender: 'female', dob: '2009-08-20', classIndex: 5 },
      { name: 'Varun Khanna', email: 'varun.khanna@sparkstudent.com', rollNumber: '1103', admissionNumber: 'ADM2026024', gender: 'male', dob: '2009-12-01', classIndex: 5 },
    ];

    const studentDocs = [];
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
          isActive: true,
          address: {
            street: '45 Lotus Boulevard',
            city: 'Spark City',
            state: 'Metropolis',
            zipCode: '110001',
            country: 'India',
          },
          phone: '+919812345678',
        });
      } else {
        student.isActive = true;
        student.status = 'active';
        await student.save();
      }
      studentDocs.push(student);
    }
    console.log(`   Seeded/verified ${studentDocs.length} active students.`);

    // ==========================================
    // 6. PARENTS
    // ==========================================
    console.log('\n👨‍👩‍👧 Seeding Parents...');
    const parentList = [
      { name: 'Mr. Rajesh Patel', email: 'rajesh.patel@parent.com', phone: '+919800011101', parentType: 'father', studentIndex: 0, occupation: 'Software Architect' },
      { name: 'Mrs. Sunita Sharma', email: 'sunita.sharma@parent.com', phone: '+919800011102', parentType: 'mother', studentIndex: 1, occupation: 'Senior Physician' },
      { name: 'Mr. Arvind Gupta', email: 'arvind.gupta@parent.com', phone: '+919800011103', parentType: 'father', studentIndex: 2, occupation: 'Civil Engineer' },
      { name: 'Mrs. Rekha Verma', email: 'rekha.verma@parent.com', phone: '+919800011104', parentType: 'mother', studentIndex: 3, occupation: 'Chartered Accountant' },
      { name: 'Mr. Harpreet Singh', email: 'harpreet.singh@parent.com', phone: '+919800011105', parentType: 'father', studentIndex: 4, occupation: 'Business Entrepreneur' },
      { name: 'Mr. Raman Iyer', email: 'raman.iyer@parent.com', phone: '+919800011106', parentType: 'father', studentIndex: 5, occupation: 'Financial Consultant' },
      { name: 'Mrs. Lakshmi Nair', email: 'lakshmi.nair@parent.com', phone: '+919800011107', parentType: 'mother', studentIndex: 6, occupation: 'University Professor' },
      { name: 'Mr. Suresh Joshi', email: 'suresh.joshi@parent.com', phone: '+919800011108', parentType: 'father', studentIndex: 12, occupation: 'Senior Advocate' },
    ];

    for (const p of parentList) {
      let parent = await Parent.findOne({ schoolId: school._id, email: p.email });
      if (!parent) {
        await Parent.create({
          name: p.name,
          email: p.email,
          password: 'Parent@123',
          phone: p.phone,
          parentType: p.parentType,
          studentIds: [studentDocs[p.studentIndex]._id],
          studentId: studentDocs[p.studentIndex]._id,
          schoolId: school._id,
          occupation: p.occupation,
          address: {
            street: '12 Heritage Park Road',
            city: 'Spark City',
            state: 'Metropolis',
            zipCode: '110001',
            country: 'India',
          },
          isActive: true,
        });
      }
    }
    console.log(`   Seeded/verified parents.`);

    // ==========================================
    // 7. HOUSES
    // ==========================================
    console.log('\n🛡️ Seeding Houses...');
    const houseList = [
      { name: 'Red Phoenix', description: 'House of Courage, Resilience and Leadership', color: '#EF4444', points: 480 },
      { name: 'Blue Pegasus', description: 'House of Wisdom, Integrity and Intellect', color: '#3B82F6', points: 450 },
      { name: 'Green Dragon', description: 'House of Harmony, Growth and Sportsmanship', color: '#10B981', points: 420 },
      { name: 'Gold Gryphon', description: 'House of Excellence, Valour and Creativity', color: '#F59E0B', points: 390 },
    ];

    for (const h of houseList) {
      let house = await House.findOne({ schoolId: school._id, name: h.name });
      if (!house) {
        await House.create({
          ...h,
          schoolId: school._id,
          createdBy: admin._id,
          isActive: true,
        });
      } else {
        house.points = h.points;
        await house.save();
      }
    }
    console.log(`   Seeded 4 school houses.`);

    // ==========================================
    // 8. DAILY STUDENT ATTENDANCE (Dashboard Chart)
    // ==========================================
    console.log('\n📅 Seeding 14-Day Attendance for Dashboard Chart...');
    const primaryClass = classDocs[0]; // Class 10-A
    const primarySubject = subjectDocs[0]; // Math 10
    const primaryTeacher = teacherDocs[0].user;

    const class10Students = studentDocs.filter(s => s.classId.toString() === primaryClass._id.toString());
    const today = new Date();

    let attendanceCreated = 0;
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const recordDate = new Date(today);
      recordDate.setDate(today.getDate() - dayOffset);

      // Skip Sunday (day 0)
      if (recordDate.getDay() === 0) continue;

      const dateStr = recordDate.toISOString().split('T')[0];

      for (let sIdx = 0; sIdx < class10Students.length; sIdx++) {
        const student = class10Students[sIdx];

        // Realistic attendance pattern: 88% present, 8% absent, 4% late
        let status = 'present';
        const rand = (sIdx + dayOffset * 3) % 10;
        if (rand === 0) status = 'absent';
        else if (rand === 1 && dayOffset % 2 === 0) status = 'late';

        const existingAtt = await Attendance.findOne({
          schoolId: school._id,
          studentId: student._id,
          attendanceDateStr: dateStr,
        });

        if (!existingAtt) {
          try {
            await Attendance.create({
              schoolId: school._id,
              studentId: student._id,
              classId: primaryClass._id,
              subjectId: primarySubject._id,
              teacherId: primaryTeacher._id,
              date: recordDate,
              attendanceDateStr: dateStr,
              status,
              remarks: status === 'present' ? 'Attentive & punctual' : status === 'late' ? 'Late by 10 mins' : 'Sick leave reported',
              markedBy: admin._id,
              academicYear: '2026',
              isActive: true,
            });
            attendanceCreated++;
          } catch (e) {
            // ignore duplicate keys if race condition
          }
        }
      }
    }
    console.log(`   Seeded ${attendanceCreated} attendance records for Class 10-A.`);

    // ==========================================
    // 9. EXAMS & EXAM MARKS (Student Progress)
    // ==========================================
    console.log('\n📝 Seeding Exams, Papers & Marks...');
    const examList = [
      { name: 'Term 1 Mid-Term Examination', examType: 'Mid Term', totalMarks: 100, passingMarks: 35, duration: 180, classId: primaryClass._id, subjectId: primarySubject._id },
      { name: 'Unit Test 1 - Mathematics & Science', examType: 'Unit Test', totalMarks: 50, passingMarks: 20, duration: 90, classId: primaryClass._id, subjectId: primarySubject._id },
      { name: 'Quarterly English & Literature Assessment', examType: 'Unit Test', totalMarks: 50, passingMarks: 20, duration: 90, classId: primaryClass._id, subjectId: subjectDocs[2]._id },
    ];

    const examDocs = [];
    for (const ex of examList) {
      let exam = await Exam.findOne({ schoolId: school._id, name: ex.name });
      if (!exam) {
        exam = await Exam.create({
          name: ex.name,
          examType: ex.examType,
          schoolId: school._id,
          classId: ex.classId,
          subjectId: ex.subjectId,
          startDate: new Date('2026-10-15'),
          endDate: new Date('2026-10-25'),
          examDate: new Date('2026-10-18'),
          examTime: '09:00 AM',
          duration: ex.duration,
          totalMarks: ex.totalMarks,
          passingMarks: ex.passingMarks,
          status: 'completed',
          createdBy: admin._id,
        });
      }
      examDocs.push(exam);
    }

    // Seed marks for Class 10 students
    let marksCreated = 0;
    const scores = [94, 91, 88, 85, 82, 79, 76, 73];
    for (const exam of examDocs) {
      for (let i = 0; i < class10Students.length; i++) {
        const student = class10Students[i];
        let markDoc = await ExamMark.findOne({ examId: exam._id, studentId: student._id });
        if (!markDoc) {
          const score = Math.round((scores[i % scores.length] / 100) * exam.totalMarks);
          const pct = Math.round((score / exam.totalMarks) * 100);
          const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : 'B';

          await ExamMark.create({
            schoolId: school._id,
            examId: exam._id,
            studentId: student._id,
            classId: primaryClass._id,
            subjectId: exam.subjectId,
            marksObtained: score,
            totalMarks: exam.totalMarks,
            percentage: pct,
            grade,
            isPassed: score >= exam.passingMarks,
            isAbsent: false,
            remarks: 'Strong conceptual clarity and methodical problem solving.',
            enteredBy: admin._id,
          });
          marksCreated++;
        }
      }
    }
    console.log(`   Seeded ${marksCreated} student exam marks across exams.`);

    // Question Paper
    let qp = await QuestionPaper.findOne({ schoolId: school._id, title: 'Class 10 Mathematics Mid-Term Paper 2026' });
    if (!qp) {
      await QuestionPaper.create({
        schoolId: school._id,
        classId: primaryClass._id,
        subjectId: primarySubject._id,
        title: 'Class 10 Mathematics Mid-Term Paper 2026',
        instructions: 'Answer all questions. Sections A, B and C are compulsory.',
        totalMarks: 100,
        status: 'approved',
        createdBy: teacherDocs[0].user._id,
        approvedBy: admin._id,
        approvedAt: new Date(),
        questions: [
          { text: 'Find the roots of the quadratic equation 2x^2 - 5x + 3 = 0.', marks: 3, answer: 'x = 1 or x = 3/2' },
          { text: 'State and prove the Basic Proportionality Theorem.', marks: 5, answer: 'If a line is drawn parallel to one side of a triangle...' },
          { text: 'Evaluate: sin^2(30) + cos^2(30).', marks: 2, answer: '1' },
        ],
      });
      console.log('   Seeded sample Question Paper.');
    }

    // ==========================================
    // 10. IMPORTANT DATES & EVENTS (Dashboard Calendar)
    // ==========================================
    console.log('\n🗓️ Seeding Events & Important Dates...');
    const importantDates = [
      { title: "Children's Day Cultural Fest & Carnival", type: 'event', priority: 'high', date: new Date('2026-11-14T09:00:00Z'), description: 'Annual Children Day celebration featuring inter-house talent shows, stalls, and music.' },
      { title: 'STEM & Robotics Exhibition 2026', type: 'event', priority: 'high', date: new Date('2026-11-20T10:00:00Z'), description: 'Student demonstrations of AI robotics models, renewable energy prototypes, and code projects.' },
      { title: 'Term 1 Parent-Teacher General Conference', type: 'meeting', priority: 'critical', date: new Date('2026-11-28T08:30:00Z'), description: 'Comprehensive student performance review, one-on-one parent faculty discussions, and report card distribution.' },
      { title: 'Annual Inter-School Sports Olympiad', type: 'event', priority: 'high', date: new Date('2026-12-10T08:00:00Z'), description: 'Three-day athletic tournament spanning track, basketball, football, and badminton.' },
      { title: 'Winter Vacation & Holiday Recess', type: 'holiday', priority: 'normal', date: new Date('2026-12-24T00:00:00Z'), description: 'Winter break for all student cohorts.' },
      { title: 'National Republic Day Celebration', type: 'holiday', priority: 'high', date: new Date('2027-01-26T08:00:00Z'), description: 'Flag hoisting ceremony, patriotic songs, and NCC drill display.' },
    ];

    for (const ev of importantDates) {
      let existingEvent = await ImportantDate.findOne({ schoolId: school._id, title: ev.title });
      if (!existingEvent) {
        await ImportantDate.create({
          ...ev,
          schoolId: school._id,
          applyToAllClasses: true,
          createdBy: admin._id,
        });
      }
    }
    console.log(`   Seeded ${importantDates.length} upcoming events.`);

    // ==========================================
    // 11. ANNOUNCEMENTS & NOTICES (Dashboard Noticeboard)
    // ==========================================
    console.log('\n📢 Seeding Announcements...');
    const announcements = [
      {
        title: 'Annual Sports Olympiad 2026 — Registration & Trials',
        content: 'House captains and sports coaches will conduct trials for athletics, football, basketball, and table tennis starting Monday. All students are encouraged to participate.',
        category: 'sports',
        priority: 'high',
        publishDate: new Date('2026-11-04'),
      },
      {
        title: 'Parent-Teacher Conference (Term 1) Schedule Announced',
        content: 'The schedule for Term 1 Parent-Teacher Conference is now published. Please book your preferred slot via the portal or contact class teachers.',
        category: 'academic',
        priority: 'urgent',
        publishDate: new Date('2026-11-05'),
      },
      {
        title: 'Science & STEM Innovation Fair — Call for Submissions',
        content: 'Students from Classes 8 to 12 can submit project abstracts for the Science Fair in the physics and computer labs before November 18.',
        category: 'academic',
        priority: 'normal',
        publishDate: new Date('2026-11-02'),
      },
      {
        title: 'Winter Uniform Mandatory Effective November 15',
        content: 'All students are requested to switch to the official school navy blue blazer and sweater as per the winter dress code guidelines.',
        category: 'administrative',
        priority: 'normal',
        publishDate: new Date('2026-11-01'),
      },
      {
        title: 'Online Fee Payment Gateway Upgraded with Instant Receipts',
        content: 'The fee portal now supports instant digital receipts, UPI, and debit card transactions. For payment inquiries, visit the Bursar office.',
        category: 'administrative',
        priority: 'normal',
        publishDate: new Date('2026-10-28'),
      },
    ];

    for (const an of announcements) {
      let exAn = await Announcement.findOne({ schoolId: school._id, title: an.title });
      if (!exAn) {
        await Announcement.create({
          ...an,
          schoolId: school._id,
          type: 'notice',
          audience: { students: true, teachers: true, parents: true, staff: true },
          createdBy: admin._id,
        });
      }
    }
    console.log(`   Seeded ${announcements.length} school announcements.`);

    // ==========================================
    // 12. FINANCIALS: FEE CATEGORIES, STRUCTURES, COLLECTIONS & SALARIES
    // ==========================================
    console.log('\n💰 Seeding Financials (Income & Expense Data for Dashboard Chart)...');
    // Categories
    const feeCatData = [
      { name: 'Tuition Fee - Term 1', description: 'Academic curriculum and instruction fee', chargeType: 'recurring' },
      { name: 'Laboratory & Science Fee', description: 'Access to physics, chemistry and computer labs', chargeType: 'one_time' },
      { name: 'Library & Digital Resources', description: 'E-learning resources and physical library membership', chargeType: 'one_time' },
      { name: 'Sports & Extracurricular Activities', description: 'Access to sports facilities, courts and tournaments', chargeType: 'recurring' },
    ];

    const feeCatDocs = [];
    for (const fc of feeCatData) {
      let cat = await FeeCategory.findOne({ school: school._id, name: fc.name });
      if (!cat) {
        cat = await FeeCategory.create({
          school: school._id,
          name: fc.name,
          description: fc.description,
          chargeType: fc.chargeType,
          createdBy: admin._id,
        });
      }
      feeCatDocs.push(cat);
    }

    // Fee Structure
    let feeStruct = await FeeStructure.findOne({ school: school._id, name: 'Standard Secondary Academic Fee 2026' });
    if (!feeStruct) {
      feeStruct = await FeeStructure.create({
        school: school._id,
        name: 'Standard Secondary Academic Fee 2026',
        category: feeCatDocs[0]._id,
        amount: 3200,
        totalAmount: 3200,
        frequency: 'monthly',
        dueDay: 5,
        academicYear: '2026',
        createdBy: admin._id,
      });
    }

    // Fee Collections (Income) for November 2026 and October 2026
    // Dashboard checks: `paymentYear === useYear && paymentMonth === useMonth` -> day 1-31
    const incomeDates = [
      { day: 1, amount: 3200 },
      { day: 2, amount: 6400 },
      { day: 3, amount: 9600 },
      { day: 4, amount: 6400 },
      { day: 5, amount: 12800 },
      { day: 6, amount: 6400 },
    ];

    let collectionCount = 0;
    for (let i = 0; i < incomeDates.length; i++) {
      const inc = incomeDates[i];
      const student = studentDocs[i % studentDocs.length];
      const payDate = new Date(2026, 10, inc.day, 11, 30); // Month 10 is November in JS 0-indexed Date

      let collection = await FeeCollection.findOne({
        school: school._id,
        student: student._id,
        month: `November 2026 - Day ${inc.day}`,
      });

      if (!collection) {
        collection = await FeeCollection.create({
          school: school._id,
          student: student._id,
          feeStructure: feeStruct._id,
          academicYear: '2026',
          month: `November 2026 - Day ${inc.day}`,
          totalAmount: inc.amount,
          paidAmount: inc.amount,
          dueAmount: 0,
          dueDate: payDate,
          status: 'paid',
          payments: [{
            amount: inc.amount,
            paymentDate: payDate,
            paymentMethod: 'online',
            transactionId: `TXN2026110${inc.day}00${i}`,
            collectedBy: admin._id,
            remarks: 'Paid via Spark ERP Online Gateway',
          }],
          createdBy: admin._id,
        });

        await FeeReceipt.create({
          school: school._id,
          receiptNumber: `REC-202611-00${i + 1}`,
          student: student._id,
          feeCollection: collection._id,
          feeStructure: feeStruct._id,
          academicYear: '2026',
          paymentDate: payDate,
          amount: inc.amount,
          paymentMethod: 'online',
          transactionId: `TXN2026110${inc.day}00${i}`,
          status: 'active',
          createdBy: admin._id,
        });
        collectionCount++;
      }
    }
    console.log(`   Seeded ${collectionCount} paid Fee Collections & Receipts for November 2026 income.`);

    // Salaries (Expenses) for November 2026
    let salaryCount = 0;
    for (let i = 0; i < teacherDocs.length; i++) {
      const { user, info } = teacherDocs[i];
      const salDay = 2 + (i % 4); // Spread over Nov 2 to Nov 5
      const salDate = new Date(2026, 10, salDay, 10, 0);

      let sal = await Salary.findOne({
        employee: user._id,
        month: 11,
        year: 2026,
        schoolId: school._id,
      });

      if (!sal) {
        const basic = info.basicSalary;
        const houseRent = Math.round(basic * 0.2);
        const medical = 400;
        const transport = 300;
        const tax = Math.round(basic * 0.1);
        const insurance = 200;
        const net = basic + houseRent + medical + transport - tax - insurance;

        sal = await Salary.create({
          employee: user._id,
          schoolId: school._id,
          designation: info.designation,
          basicSalary: basic,
          allowances: { houseRent, medical, transport, other: 0 },
          deductions: { tax, insurance, loan: 0, other: 0 },
          month: 11,
          year: 2026,
          status: 'paid',
          paymentDate: salDate,
          paymentMethod: 'bank_transfer',
          notes: 'November 2026 payroll disbursed on schedule.',
          isActive: true,
        });
        salaryCount++;
      }
    }
    console.log(`   Seeded ${salaryCount} paid Salary disbursements for November 2026 expenses.`);

    // ==========================================
    // 13. LIBRARY (Books & Borrowings)
    // ==========================================
    console.log('\n📖 Seeding Library...');
    const booksList = [
      { name: 'Concepts of Physics (Volume 1 & 2)', author: 'Prof. H.C. Verma', isbn: '978-8177091878', category: 'Physics', location: 'Shelf A-12', quantity: 15, description: 'Foundational textbook on classical mechanics and thermodynamics.' },
      { name: 'Brief Answers to the Big Questions', author: 'Stephen Hawking', isbn: '978-1473695993', category: 'Science', location: 'Shelf S-04', quantity: 10, description: 'Reflections on the cosmos, time and humanity future.' },
      { name: 'Introduction to Algorithms (4th Edition)', author: 'Cormen, Leiserson, Rivest, Stein', isbn: '978-0262046305', category: 'Computer Science', location: 'Shelf CS-01', quantity: 8, description: 'Comprehensive reference for algorithmic design and analysis.' },
      { name: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0061120084', category: 'Literature', location: 'Shelf L-09', quantity: 12, description: 'Timeless American classic exploring justice and compassion.' },
      { name: 'The Discovery of India', author: 'Jawaharlal Nehru', isbn: '978-0143031031', category: 'History', location: 'Shelf H-05', quantity: 14, description: 'An overview of Indian culture, history and philosophy.' },
      { name: 'Clean Code: A Handbook of Agile Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Computer Science', location: 'Shelf CS-03', quantity: 6, description: 'Best practices for writing maintainable software.' },
      { name: 'Wings of Fire: An Autobiography', author: 'Dr. A.P.J. Abdul Kalam', isbn: '978-8173711466', category: 'Biography', location: 'Shelf B-02', quantity: 18, description: 'Inspiring life story of India missile scientist and president.' },
      { name: 'A Short History of Nearly Everything', author: 'Bill Bryson', isbn: '978-0767908184', category: 'Science', location: 'Shelf S-08', quantity: 11, description: 'Accessible and humorous journey through scientific discoveries.' },
    ];

    const bookDocs = [];
    for (const b of booksList) {
      let book = await Book.findOne({ schoolId: school._id, name: b.name });
      if (!book) {
        book = await Book.create({
          ...b,
          schoolId: school._id,
        });
      }
      bookDocs.push(book);
    }

    // Seed book borrowings
    for (let i = 0; i < 4; i++) {
      let borrowing = await BookBorrowing.findOne({ schoolId: school._id, bookId: bookDocs[i]._id, studentId: studentDocs[i]._id });
      if (!borrowing) {
        await BookBorrowing.create({
          bookId: bookDocs[i]._id,
          studentId: studentDocs[i]._id,
          schoolId: school._id,
          borrowDate: new Date('2026-11-01'),
          dueDate: new Date('2026-11-15'),
          status: 'borrowed',
          notes: 'Standard 14-day student book issue.',
        });
      }
    }
    console.log(`   Seeded ${bookDocs.length} library books and borrowings.`);

    // ==========================================
    // 14. TRANSPORT (Vehicles, Drivers, Routes, Allocations)
    // ==========================================
    console.log('\n🚌 Seeding Transport Fleet, Routes & Drivers...');
    const vehicleList = [
      { vehicleNumber: 'SPARK-BUS-01', registrationNumber: 'DL01-AB-1001', vehicleType: 'School Bus', capacity: 42, manufacturer: 'Tata Motors', model: 'Starbus Ultra', year: 2024, color: 'School Yellow' },
      { vehicleNumber: 'SPARK-BUS-02', registrationNumber: 'DL01-AB-1002', vehicleType: 'School Bus', capacity: 45, manufacturer: 'Ashok Leyland', model: 'Sunshine 45', year: 2024, color: 'School Yellow' },
      { vehicleNumber: 'SPARK-VAN-03', registrationNumber: 'DL01-AB-1003', vehicleType: 'Van', capacity: 18, manufacturer: 'Force Motors', model: 'Traveller 3350', year: 2025, color: 'School Yellow' },
    ];

    const vehicleDocs = [];
    for (const v of vehicleList) {
      let veh = await Vehicle.findOne({ schoolId: school._id, vehicleNumber: v.vehicleNumber });
      if (!veh) {
        veh = await Vehicle.create({
          ...v,
          schoolId: school._id,
        });
      }
      vehicleDocs.push(veh);
    }

    const routeList = [
      {
        name: 'North City Express Line',
        routeNumber: 'R-NORTH-01',
        startPoint: 'City Centre Metro',
        endPoint: 'Spark School Main Gate',
        distance: '18.5 km',
        estimatedTime: '45 mins',
        stops: [
          { name: 'City Centre Metro Station', arrivalTime: '07:15 AM' },
          { name: 'Green Park Crossroad', arrivalTime: '07:28 AM' },
          { name: 'Civil Lines Enclave', arrivalTime: '07:42 AM' },
          { name: 'Spark School Main Gate', arrivalTime: '08:00 AM' },
        ],
      },
      {
        name: 'South Suburbs & IT Corridor',
        routeNumber: 'R-SOUTH-02',
        startPoint: 'Tech Hub Boulevard',
        endPoint: 'Spark School Main Gate',
        distance: '22 km',
        estimatedTime: '50 mins',
        stops: [
          { name: 'Tech Hub Circle', arrivalTime: '07:10 AM' },
          { name: 'Lake View Apartments', arrivalTime: '07:25 AM' },
          { name: 'Palm Avenue Phase 2', arrivalTime: '07:40 AM' },
          { name: 'Spark School Main Gate', arrivalTime: '08:00 AM' },
        ],
      },
    ];

    const routeDocs = [];
    for (const r of routeList) {
      let route = await Route.findOne({ schoolId: school._id, routeNumber: r.routeNumber });
      if (!route) {
        route = await Route.create({
          ...r,
          schoolId: school._id,
        });
      }
      routeDocs.push(route);
    }

    const driverList = [
      { name: 'Mr. Ramesh Yadav', phone: '+919870010001', licenseNumber: 'DL-HEAVY-2021-0091', licenseType: 'Heavy Vehicle', licenseExpiryDate: new Date('2029-05-20'), vehicleId: vehicleDocs[0]._id },
      { name: 'Mr. Balwinder Singh', phone: '+919870010002', licenseNumber: 'DL-HEAVY-2022-0044', licenseType: 'Heavy Vehicle', licenseExpiryDate: new Date('2028-11-12'), vehicleId: vehicleDocs[1]._id },
    ];

    for (const dr of driverList) {
      let driver = await Driver.findOne({ schoolId: school._id, licenseNumber: dr.licenseNumber });
      if (!driver) {
        await Driver.create({
          ...dr,
          schoolId: school._id,
        });
      }
    }

    // Allocate student transport
    for (let i = 0; i < 6; i++) {
      let stTransport = await StudentTransport.findOne({ schoolId: school._id, studentId: studentDocs[i]._id });
      if (!stTransport) {
        await StudentTransport.create({
          schoolId: school._id,
          studentId: studentDocs[i]._id,
          routeId: routeDocs[i % 2]._id,
          vehicleId: vehicleDocs[i % 2]._id,
          pickupPoint: routeDocs[i % 2].stops[1].name,
          pickupTime: routeDocs[i % 2].stops[1].arrivalTime,
          dropTime: '02:45 PM',
          status: 'active',
        });
      }
    }
    console.log(`   Seeded vehicles, routes, drivers, and student transport allocations.`);

    // ==========================================
    // 15. INVENTORY ITEMS
    // ==========================================
    console.log('\n📦 Seeding Inventory...');
    const inventoryList = [
      { name: 'Compound Optical Microscopes (1000x)', sku: 'INV-LAB-MIC-01', category: 'lab_equipment', quantity: 24, unit: 'pieces', price: { costPrice: 180, sellingPrice: 220 }, location: { building: 'Science Block', room: 'Biology Lab 2', shelf: 'Cabinet A' }, supplier: { name: 'Optics Precision Labs', contact: '+919876500001' } },
      { name: 'Interactive Smart Touch Displays (75")', sku: 'INV-ELC-DISP-02', category: 'electronics', quantity: 12, unit: 'pieces', price: { costPrice: 850, sellingPrice: 1050 }, location: { building: 'Academic Block', room: 'Smart Class 301', shelf: 'Wall Mount' }, supplier: { name: 'Apex Digital Solutions', contact: '+919876500002' } },
      { name: 'FIFA Quality Professional Footballs', sku: 'INV-SPT-BALL-03', category: 'sports', quantity: 35, unit: 'pieces', price: { costPrice: 25, sellingPrice: 35 }, location: { building: 'Sports Pavilion', room: 'Equipment Locker', shelf: 'Bin 3' }, supplier: { name: 'Champion Sports Gear', contact: '+919876500003' } },
      { name: 'A4 High-Speed Copier Paper Boxes', sku: 'INV-STN-PPR-04', category: 'stationery', quantity: 80, unit: 'boxes', price: { costPrice: 18, sellingPrice: 24 }, location: { building: 'Admin Block', room: 'Stationery Store', shelf: 'Rack 1' }, supplier: { name: 'Metro Paper Mills', contact: '+919876500004' } },
      { name: 'Borosilicate Glass Chemistry Beaker Set', sku: 'INV-LAB-BEAK-05', category: 'lab_equipment', quantity: 50, unit: 'sets', price: { costPrice: 30, sellingPrice: 42 }, location: { building: 'Science Block', room: 'Chemistry Store', shelf: 'Shelf C-4' }, supplier: { name: 'SciTech Glassware', contact: '+919876500005' } },
      { name: 'Ergonomic Single Student Desk & Chair', sku: 'INV-FUR-DSK-06', category: 'furniture', quantity: 60, unit: 'sets', price: { costPrice: 75, sellingPrice: 95 }, location: { building: 'Main Wing', room: 'Room 205', shelf: 'Rows 1-6' }, supplier: { name: 'Comfort Educational Furniture', contact: '+919876500006' } },
    ];

    for (const inv of inventoryList) {
      let item = await InventoryItem.findOne({ schoolId: school._id, sku: inv.sku });
      if (!item) {
        await InventoryItem.create({
          ...inv,
          schoolId: school._id,
        });
      }
    }
    console.log(`   Seeded ${inventoryList.length} inventory items.`);

    // ==========================================
    // 16. ADMISSIONS APPLICATIONS
    // ==========================================
    console.log('\n📄 Seeding Admissions...');
    const admissionsList = [
      { studentName: 'Aarohi Sen', dateOfBirth: new Date('2011-06-18'), gender: 'female', classApplied: classDocs[2]._id, academicYear: '2026', applicationNumber: 'APP-2026-081', status: 'approved', parentDetails: { name: 'Dr. Kaushik Sen', relation: 'father', contact: '+919811223344', email: 'kaushik.sen@hospital.org' }, address: { city: 'Spark City', state: 'Metropolis', pincode: '110001' } },
      { studentName: 'Devansh Kapoor', dateOfBirth: new Date('2010-09-24'), gender: 'male', classApplied: classDocs[0]._id, academicYear: '2026', applicationNumber: 'APP-2026-082', status: 'under_review', parentDetails: { name: 'Mrs. Neha Kapoor', relation: 'mother', contact: '+919811223345', email: 'neha.kapoor@design.co' }, address: { city: 'Spark City', state: 'Metropolis', pincode: '110001' } },
      { studentName: 'Meera Deshmukh', dateOfBirth: new Date('2012-03-11'), gender: 'female', classApplied: classDocs[4]._id, academicYear: '2026', applicationNumber: 'APP-2026-083', status: 'pending', parentDetails: { name: 'Mr. Rahul Deshmukh', relation: 'father', contact: '+919811223346', email: 'rahul.deshmukh@law.in' }, address: { city: 'Spark City', state: 'Metropolis', pincode: '110001' } },
    ];

    for (const adm of admissionsList) {
      let app = await AdmissionApplication.findOne({ schoolId: school._id, applicationNumber: adm.applicationNumber });
      if (!app) {
        await AdmissionApplication.create({
          ...adm,
          schoolId: school._id,
        });
      }
    }
    console.log(`   Seeded ${admissionsList.length} admission applications.`);

    // ==========================================
    // 17. ASSIGNMENTS / HOMEWORK
    // ==========================================
    console.log('\n✍️ Seeding Assignments...');
    const assignmentsList = [
      {
        title: 'Quadratic Equations & Roots Problem Set',
        description: 'Solve questions 1 through 15 from Chapter 4. Include step-by-step discriminant calculations and graphical sketches.',
        classId: primaryClass._id,
        subjectId: primarySubject._id,
        teacherId: primaryTeacher._id,
        dueDate: new Date('2026-11-15T18:00:00Z'),
      },
      {
        title: 'Chemical Reactions & Stoichiometry Lab Report',
        description: 'Complete the write-up for the magnesium ribbon combustion experiment with balanced chemical equations.',
        classId: primaryClass._id,
        subjectId: subjectDocs[1]._id,
        teacherId: teacherDocs[1].user._id,
        dueDate: new Date('2026-11-18T18:00:00Z'),
      },
      {
        title: 'Python Object-Oriented Programming Task',
        description: 'Construct a Student Class hierarchy with inheritance, encapsulation, and sample calculation methods.',
        classId: primaryClass._id,
        subjectId: subjectDocs[3]._id,
        teacherId: teacherDocs[3].user._id,
        dueDate: new Date('2026-11-20T18:00:00Z'),
      },
    ];

    for (const asg of assignmentsList) {
      let existingAsg = await Assignment.findOne({ schoolId: school._id, title: asg.title });
      if (!existingAsg) {
        await Assignment.create({
          ...asg,
          schoolId: school._id,
          createdBy: admin._id,
        });
      }
    }
    console.log(`   Seeded ${assignmentsList.length} assignments.`);

    // ==========================================
    // 18. SYLLABUS
    // ==========================================
    console.log('\n📑 Seeding Syllabus...');
    let syl = await Syllabus.findOne({ schoolId: school._id, classId: primaryClass._id, subjectId: primarySubject._id });
    if (!syl) {
      await Syllabus.create({
        schoolId: school._id,
        classId: primaryClass._id,
        subjectId: primarySubject._id,
        teacherId: primaryTeacher._id,
        academicYear: '2026',
        createdBy: admin._id,
        title: 'Class 10 Mathematics Complete Syllabus 2026',
        description: 'Curriculum covering Real Numbers, Polynomials, Linear Equations, Trigonometry and Statistics.',
        chapters: [
          {
            title: 'Chapter 1: Real Numbers & Euclid Lemma',
            description: 'Fundamental Theorem of Arithmetic and irrationality proofs.',
            order: 1,
            status: 'completed',
            topics: [
              { title: 'Euclid Division Algorithm', description: 'Computing HCF of large integers', duration: { hours: 4, minutes: 0 }, status: 'completed' },
              { title: 'Revisiting Irrational Numbers', description: 'Proofs for sqrt(2) and sqrt(3)', duration: { hours: 3, minutes: 0 }, status: 'completed' },
            ],
          },
          {
            title: 'Chapter 2: Polynomials & Quadratic Equations',
            description: 'Zeros of polynomials and quadratic formula derivations.',
            order: 2,
            status: 'in-progress',
            topics: [
              { title: 'Geometrical Meaning of Zeros', description: 'Parabolic graphs and intersections', duration: { hours: 4, minutes: 30 }, status: 'completed' },
              { title: 'Nature of Roots & Discriminant', description: 'Conditions for real, distinct or imaginary roots', duration: { hours: 5, minutes: 0 }, status: 'in-progress' },
            ],
          },
        ],
      });
      console.log('   Seeded Mathematics Syllabus.');
    }

    // ==========================================
    // 19. SCHOOL PRODUCTS / SHOP
    // ==========================================
    console.log('\n🛍️ Seeding School Shop Products...');
    const productList = [
      { name: 'Official Winter Blazer - Navy Blue', description: 'Premium wool-blend tailored school blazer with embroidered gold crest.', price: 48, stock: 75, sku: 'BLAZER-NVY-10', tags: ['uniform', 'winter', 'apparel'], status: 'active' },
      { name: 'Complete Formal Uniform Set', description: 'Includes 2 branded cotton shirts, 2 pleated trousers/skirts, and 1 tie.', price: 36, stock: 120, sku: 'UNIFORM-SET-01', tags: ['uniform', 'formal', 'apparel'], status: 'active' },
      { name: 'Athletic Sports Tracksuit & Jersey', description: 'Breathable dry-fit polyester jacket and jogger set with school insignia.', price: 28, stock: 90, sku: 'SPORT-TRK-02', tags: ['sports', 'jersey'], status: 'active' },
      { name: 'Ergonomic Orthopedic School Backpack', description: 'Padded shoulder straps, water-resistant fabric, and 15" laptop sleeve.', price: 26, stock: 65, sku: 'BAG-ERG-03', tags: ['accessories', 'bags'], status: 'active' },
      { name: 'Advanced Science Lab Protective Coat & Goggles', description: '100% white cotton lab apron with anti-fog safety eye protectors.', price: 20, stock: 85, sku: 'LAB-KIT-04', tags: ['science', 'lab'], status: 'active' },
      { name: 'Mathematical Geometry & Drafting Set', description: 'Heavy-duty zinc alloy compass, divider, protractor and precision rulers.', price: 12, stock: 150, sku: 'MATH-GEO-05', tags: ['stationery', 'math'], status: 'active' },
    ];

    for (const prod of productList) {
      let pr = await SchoolProduct.findOne({ sku: prod.sku });
      if (!pr) {
        await SchoolProduct.create({
          ...prod,
          supplier: { name: 'Spark School Store Supplies', contact: '+919876540099' },
          images: [{ url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', isPrimary: true }],
          pricing: { cost: prod.price * 0.7, markup: 30, discount: 0 },
        });
      }
    }
    console.log(`   Seeded ${productList.length} school store products.`);

    // ==========================================
    // 20. NOTIFICATIONS
    // ==========================================
    console.log('\n🔔 Seeding Notifications...');
    const notifList = [
      { title: 'Term 1 Report Cards Ready', message: 'Examination marks and grade summaries for Class 10 Mid-Terms have been validated.', type: 'grade', priority: 'high', isRead: false },
      { title: 'Fee Payment Received', message: 'Payment of $3,200 received via Online Gateway. Digital receipt generated.', type: 'general', priority: 'medium', isRead: true },
      { title: 'Sports Olympiad Schedule', message: 'Inter-house athletic trials schedule has been posted on the student dashboard.', type: 'achievement', priority: 'medium', isRead: false },
    ];

    for (const n of notifList) {
      await Notification.create({
        ...n,
        recipient: admin._id,
        recipientModel: 'User',
        sender: admin._id,
        schoolId: school._id,
      });
    }
    console.log(`   Seeded ${notifList.length} notifications.`);

    // ==========================================
    // 21. STUDY NOTES
    // ==========================================
    console.log('\n📝 Seeding Study Notes...');
    let sampleNote = await Note.findOne({ schoolId: school._id, title: 'Key Formulae & Theorem Reference: Class 10 Math' });
    if (!sampleNote) {
      await Note.create({
        schoolId: school._id,
        classId: primaryClass._id,
        subjectId: primarySubject._id,
        teacherId: primaryTeacher._id,
        title: 'Key Formulae & Theorem Reference: Class 10 Math',
        content: 'Comprehensive reference sheet containing quadratic formulas, arithmetic progression nth terms, and trigonometric identities for quick revision.',
        createdBy: primaryTeacher._id,
        isActive: true,
      });
      console.log('   Seeded sample teacher study note.');
    }

    // ==========================================
    // UPDATE SCHOOL COUNTS
    // ==========================================
    const totalStudents = await Student.countDocuments({ schoolId: school._id, status: 'active' });
    const totalTeachers = await User.countDocuments({ schoolId: school._id, role: 'teacher' });
    school.students = totalStudents;
    school.teachers = totalTeachers;
    await school.save();

    console.log('\n======================================================');
    console.log('🎉 MASTER DEMO DATA SEEDING COMPLETE!');
    console.log('======================================================');
    console.log(`🏫 School: ${school.name}`);
    console.log(`   - Students: ${totalStudents} active students`);
    console.log(`   - Teachers/Staff: ${teacherDocs.length} members`);
    console.log(`   - Classes: ${classDocs.length}`);
    console.log(`   - Subjects: ${subjectDocs.length}`);
    console.log(`   - Daily Attendance: 14-day history ready for Dashboard Chart`);
    console.log(`   - Exam Marks: Full scores & grades ready for Student Progress`);
    console.log(`   - Upcoming Events: ${importantDates.length} events for Dashboard Calendar`);
    console.log(`   - Announcements: ${announcements.length} notices for Dashboard Noticeboard`);
    console.log(`   - Financials: Income ($${incomeDates.reduce((a,b)=>a+b.amount,0)}) & Salaries ($${salaryCount*4500}) for Financial Summary`);
    console.log(`   - Library: ${bookDocs.length} books & active borrowings`);
    console.log(`   - Transport: ${vehicleDocs.length} vehicles, ${routeDocs.length} routes, allocations`);
    console.log(`   - Inventory: ${inventoryList.length} items`);
    console.log(`   - Shop: ${productList.length} products`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding master demo data:', error);
    process.exit(1);
  }
}

seedMasterData();
