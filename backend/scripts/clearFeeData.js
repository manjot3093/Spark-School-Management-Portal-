/**
 * Clear all fee management data (categories, structures, collections, receipts, payment plans).
 * Use this when old fee data is causing problems and you want a clean slate.
 *
 * Usage (from backend folder):
 *   node scripts/clearFeeData.js              # Clear ALL schools' fee data
 *   node scripts/clearFeeData.js --schoolId=YOUR_SCHOOL_ID   # Clear one school only
 *
 * Requires: config.env with MONGODB_URI (or default localhost)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });
const mongoose = require('mongoose');

const FeeReceipt = require('../models/FeeReceipt');
const FeeCollection = require('../models/FeeCollection');
const FeeStructure = require('../models/FeeStructure');
const FeeCategory = require('../models/FeeCategory');
const StudentPaymentPlan = require('../models/StudentPaymentPlan');
const Invoice = require('../models/Invoice');

async function clearFeeData(schoolId = null) {
  const filter = schoolId ? { school: schoolId } : {};
  const filterSchoolId = schoolId ? { schoolId } : {};
  const filterLabel = schoolId ? `for school ${schoolId}` : 'for ALL schools';

  console.log('\n--- Clearing fee management data', filterLabel, '---\n');

  const results = { deleted: {}, errors: [] };

  // 1. Fee receipts (reference fee collections)
  try {
    const receiptFilter = schoolId ? { school: schoolId } : {};
    const r = await FeeReceipt.deleteMany(receiptFilter);
    results.deleted.FeeReceipt = r.deletedCount;
    console.log('FeeReceipt:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'FeeReceipt', error: e.message });
    console.error('FeeReceipt error:', e.message);
  }

  // 2. Fee collections
  try {
    const r = await FeeCollection.deleteMany(filter);
    results.deleted.FeeCollection = r.deletedCount;
    console.log('FeeCollection:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'FeeCollection', error: e.message });
    console.error('FeeCollection error:', e.message);
  }

  // 3. Fee structures
  try {
    const r = await FeeStructure.deleteMany(filter);
    results.deleted.FeeStructure = r.deletedCount;
    console.log('FeeStructure:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'FeeStructure', error: e.message });
    console.error('FeeStructure error:', e.message);
  }

  // 4. Fee categories (charge types / fee heads)
  try {
    const r = await FeeCategory.deleteMany(filter);
    results.deleted.FeeCategory = r.deletedCount;
    console.log('FeeCategory:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'FeeCategory', error: e.message });
    console.error('FeeCategory error:', e.message);
  }

  // 5. Student payment plans
  try {
    const r = await StudentPaymentPlan.deleteMany(filter);
    results.deleted.StudentPaymentPlan = r.deletedCount;
    console.log('StudentPaymentPlan:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'StudentPaymentPlan', error: e.message });
    console.error('StudentPaymentPlan error:', e.message);
  }

  // 6. Invoices (fee-related; stored by schoolId)
  try {
    const r = await Invoice.deleteMany(filterSchoolId);
    results.deleted.Invoice = r.deletedCount;
    console.log('Invoice:', r.deletedCount, 'deleted');
  } catch (e) {
    results.errors.push({ model: 'Invoice', error: e.message });
    console.error('Invoice error:', e.message);
  }

  console.log('\n--- Done ---\n');
  return results;
}

async function main() {
  let schoolId = null;
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--schoolId=')) {
      schoolId = arg.replace('--schoolId=', '').trim();
      break;
    }
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lmsss-portal';
  console.log('Connecting to MongoDB...');

  try {
    await mongoose.connect(mongoURI);
    console.log('Connected.\n');
    const results = await clearFeeData(schoolId);
    const total = Object.values(results.deleted).reduce((s, n) => s + n, 0);
    console.log('Total documents deleted:', total);
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.length);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected.');
    process.exit(0);
  }
}

main();
