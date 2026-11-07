const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 8000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  messages: { type: [messageSchema], default: [] }
}, { timestamps: true });
schema.index({ schoolId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('AssistantConversation', schema);
