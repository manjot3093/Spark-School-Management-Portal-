const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['processing', 'completed', 'needs_review'], default: 'processing' }
}, { timestamps: true });

module.exports = mongoose.model('PaymentFulfillment', schema);
