const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config.env') });

async function getContextIds() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const School = require('../models/School');
  const User = require('../models/User');
  const Student = require('../models/Student');
  const Parent = require('../models/Parent');
  const Class = require('../models/Class');
  const Subject = require('../models/Subject');
  const Book = require('../models/Book');
  const Vehicle = require('../models/Vehicle');
  const Driver = require('../models/Driver');
  const Route = require('../models/Route');
  const Exam = require('../models/Exam');
  const FeeCategory = require('../models/FeeCategory');

  const school = await School.findOne();
  const admin = await User.findOne({ role: 'school_admin' });
  const teacher = await User.findOne({ role: 'teacher' });
  const student = await Student.findOne();
  const parent = await Parent.findOne();
  const classObj = await Class.findOne();
  const subject = await Subject.findOne();
  const book = await Book.findOne();
  const vehicle = await Vehicle.findOne();
  const driver = await Driver.findOne();
  const route = await Route.findOne();
  const exam = await Exam.findOne();
  const feeCat = await FeeCategory.findOne();

  const context = {
    schoolId: school ? school._id.toString() : null,
    adminId: admin ? admin._id.toString() : null,
    adminEmail: admin ? admin.email : null,
    teacherId: teacher ? teacher._id.toString() : null,
    teacherEmail: teacher ? teacher.email : null,
    studentId: student ? student._id.toString() : null,
    studentRollNumber: student ? student.rollNumber : null,
    parentId: parent ? parent._id.toString() : null,
    classId: classObj ? classObj._id.toString() : null,
    subjectId: subject ? subject._id.toString() : null,
    bookId: book ? book._id.toString() : null,
    vehicleId: vehicle ? vehicle._id.toString() : null,
    driverId: driver ? driver._id.toString() : null,
    routeId: route ? route._id.toString() : null,
    examId: exam ? exam._id.toString() : null,
    feeCategoryId: feeCat ? feeCat._id.toString() : null
  };

  console.log('Database context IDs:');
  console.log(context);
  fs.writeFileSync(path.join(__dirname, 'test_context_ids.json'), JSON.stringify(context, null, 2));
  await mongoose.disconnect();
}

getContextIds().catch(console.error);
