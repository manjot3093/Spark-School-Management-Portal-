const express = require('express');
const {
  getPaymentPlans,
  getPaymentPlan,
  upsertPaymentPlan
} = require('../controllers/studentPaymentPlanController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', authorize('school_admin', 'accountant'), getPaymentPlans);
router.get('/:id', authorize('school_admin', 'accountant'), getPaymentPlan);
router.put('/', authorize('school_admin', 'accountant'), upsertPaymentPlan);

module.exports = router;
