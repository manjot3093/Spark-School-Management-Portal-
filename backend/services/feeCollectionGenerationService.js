/**
 * Generates FeeCollection records for a student for an academic year.
 * Uses FeeStructure (by class + academic year), StudentPaymentPlan (annual/monthly/quarterly),
 * and structure frequency (one-time vs recurring). Idempotent: skips existing collections.
 */

const FeeStructure = require('../models/FeeStructure');
const FeeCollection = require('../models/FeeCollection');
const FeeCategory = require('../models/FeeCategory');
const StudentPaymentPlan = require('../models/StudentPaymentPlan');
const Student = require('../models/Student');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Get number of installments for a structure given student's plan and structure frequency.
 * @param {Object} feeStructure - FeeStructure doc
 * @param {string} plan - 'annual' | 'monthly' | 'quarterly'
 * @returns {number} 1, 4, or 12
 */
function getInstallmentCount(feeStructure, plan) {
  const freq = feeStructure.frequency || 'monthly';
  if (freq === 'one-time') return 1;
  if (plan === 'annual') return 1;
  if (plan === 'quarterly') return 4;
  return 12; // monthly
}

/**
 * Get due date for an installment (month index 0-based, academic year string e.g. "2025").
 * @param {number} monthIndex - 0-11 for monthly, 0-3 for quarterly, 0 for annual
 * @param {number} installmentCount - 1, 4, or 12
 * @param {number} dueDay - day of month 1-31
 * @param {string} academicYear - e.g. "2025"
 */
function getDueDateForInstallment(monthIndex, installmentCount, dueDay, academicYear) {
  const year = parseInt(academicYear, 10) || new Date().getFullYear();
  let month;
  if (installmentCount === 12) {
    month = monthIndex; // 0-11
  } else if (installmentCount === 4) {
    month = monthIndex * 3; // 0, 3, 6, 9
  } else {
    month = 0; // first month of year
  }
  const day = Math.min(dueDay || 1, 28);
  return new Date(year, month, day);
}

/**
 * Generate fee collections for a student for an academic year.
 * @param {Object} options - { schoolId, studentId, academicYear, createdBy }
 * @returns {Promise<{ created: number, skipped: number, collections: Array }>}
 */
async function generateDuesForStudent(options) {
  const { schoolId, studentId, academicYear, createdBy } = options;
  const created = [];
  let skipped = 0;

  const student = await Student.findOne({ _id: studentId, schoolId }).select('classId');
  if (!student) throw new Error('Student not found or does not belong to school');
  const classId = student.classId;

  const structures = await FeeStructure.find({
    school: schoolId,
    academicYear: String(academicYear),
    status: 'active',
    $or: [{ class: classId }, { class: null }]
  });

  let planDoc = await StudentPaymentPlan.findOne({ school: schoolId, student: studentId, academicYear: String(academicYear) });
  const plan = planDoc ? planDoc.plan : 'monthly';

  const dueDay = 1; // default; could be read from school config or first structure

  for (const structure of structures) {
    const installmentCount = getInstallmentCount(structure, plan);
    const totalAmount = structure.totalAmount != null && structure.totalAmount > 0 ? structure.totalAmount : (structure.amount || 0);
    const amountPerInstallment = totalAmount / installmentCount;
    const discountAmount = structure.calculateDiscount ? structure.calculateDiscount() : 0;
    const totalAfterDiscount = totalAmount - discountAmount;
    const duePerInstallment = totalAfterDiscount / installmentCount;

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = getDueDateForInstallment(i, installmentCount, structure.dueDay || dueDay, academicYear);
      const monthLabel = installmentCount === 1 && structure.frequency === 'one-time'
        ? null
        : installmentCount === 12
          ? `${MONTH_NAMES[i]} ${academicYear}`
          : installmentCount === 4
            ? `Q${i + 1} ${academicYear}`
            : `Full year ${academicYear}`;

      const existing = await FeeCollection.findOne({
        school: schoolId,
        student: studentId,
        feeStructure: structure._id,
        academicYear: String(academicYear),
        month: monthLabel,
        status: { $nin: ['cancelled'] }
      });

      if (existing) {
        skipped++;
        continue;
      }

      const collection = await FeeCollection.create({
        school: schoolId,
        student: studentId,
        feeStructure: structure._id,
        academicYear: String(academicYear),
        month: monthLabel,
        totalAmount: Math.round(amountPerInstallment * 100) / 100,
        discountAmount: installmentCount === 1 ? discountAmount : Math.round((discountAmount / installmentCount) * 100) / 100,
        lateFeeAmount: 0,
        paidAmount: 0,
        dueAmount: Math.round(duePerInstallment * 100) / 100,
        dueDate,
        status: 'pending',
        createdBy: createdBy || undefined
      });
      created.push(collection);
    }
  }

  return { created: created.length, skipped, collections: created };
}

module.exports = {
  generateDuesForStudent,
  getInstallmentCount,
  getDueDateForInstallment
};
