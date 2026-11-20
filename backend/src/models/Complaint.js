import mongoose from 'mongoose';
const complaintSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', default: null, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: ['Pickup issue', 'Donation issue', 'NGO concern', 'Account issue', 'Other'], default: 'Other' },
  status: { type: String, enum: ['Open', 'In review', 'Resolved', 'Closed'], default: 'Open', index: true },
  adminResponse: { type: String, trim: true, maxlength: 3000, default: '' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });
export default mongoose.model('Complaint', complaintSchema);
