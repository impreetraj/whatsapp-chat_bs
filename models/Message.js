const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  senderPhone: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  textContent: { type: String },
  status: { type: String, enum: ['sent', 'delivered', 'read' , 'failed'], default: 'sent' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
