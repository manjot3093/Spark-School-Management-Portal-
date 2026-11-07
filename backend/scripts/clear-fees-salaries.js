/*
  Clear fee and salary related data from the database.
  Usage:
    node scripts/clear-fees-salaries.js --confirm

  Options:
    --confirm   Required. Without this, script only does a dry run and does not delete.
    --fees-only Clear only FeeCollection and FeeReceipt (not Salary).
    --salaries-only Clear only Salary (not fees).

  Env:
    - Uses backend .env (MONGODB_URI or similar).
*/

const path = require('path');
const mongoose = require('mongoose');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (_) {}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lmsss-portal';

const FeeCollection = require('../models/FeeCollection');
const FeeReceipt = require('../models/FeeReceipt');
const Salary = require('../models/Salary');

const argv = process.argv.slice(2);
const CONFIRM = argv.includes('--confirm');
const FEES_ONLY = argv.includes('--fees-only');
const SALARIES_ONLY = argv.includes('--salaries-only');

async function run() {
  if (!CONFIRM) {
    console.log('Dry run (no data deleted). Add --confirm to actually clear data.');
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const results = { feeCollections: 0, feeReceipts: 0, salaries: 0 };

  try {
    if (!SALARIES_ONLY) {
      if (CONFIRM) {
        const fcDeleted = await FeeCollection.deleteMany({}).then((r) => r.deletedCount);
        const frDeleted = await FeeReceipt.deleteMany({}).then((r) => r.deletedCount);
        results.feeCollections = fcDeleted;
        results.feeReceipts = frDeleted;
        console.log(`Deleted FeeCollection: ${fcDeleted}, FeeReceipt: ${frDeleted}`);
      } else {
        const fcCount = await FeeCollection.countDocuments({});
        const frCount = await FeeReceipt.countDocuments({});
        console.log(`Would delete FeeCollection: ${fcCount}, FeeReceipt: ${frCount}`);
      }
    }

    if (!FEES_ONLY) {
      if (CONFIRM) {
        const sDeleted = await Salary.deleteMany({}).then((r) => r.deletedCount);
        results.salaries = sDeleted;
        console.log(`Deleted Salary: ${sDeleted}`);
      } else {
        const sCount = await Salary.countDocuments({});
        console.log(`Would delete Salary: ${sCount}`);
      }
    }

    if (CONFIRM) {
      console.log('Done.', results);
    } else {
      console.log('Dry run complete. Run with --confirm to apply.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
