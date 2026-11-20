import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 1200, default: '' },
  quantity: { type: Number, required: true, min: 1, max: 500, validate: { validator(value) { return ['Kg', 'Litres'].includes(this.unit) ? Math.abs(value * 100 - Math.round(value * 100)) < 1e-8 : Number.isInteger(value); }, message: 'Only Kg and Litres quantities may use decimals.' } },
  unit: { type: String, enum: ['Pieces', 'Pairs', 'Kg', 'Litres', 'Packets / boxes', 'Sets'], default: 'Pieces' },
  condition: { type: String, enum: ['New', 'Like new', 'Good', 'Usable', 'Sealed / packed'], default: 'Good' },
  expiryDate: { type: Date, default: null },
  pickupAddress: { type: String, required: true, trim: true, maxlength: 250 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  pickupDate: { type: Date, default: null },
  status: { type: String, enum: ['Pending', 'Accepted', 'Pickup scheduled', 'Collected', 'Distributed', 'Rejected'], default: 'Pending', index: true },
  ngoNote: { type: String, trim: true, maxlength: 1000, default: '' },
  pickupWindow: { type: String, trim: true, maxlength: 80, default: '' },
  courierName: { type: String, trim: true, maxlength: 100, default: '' },
  trackingCode: { type: String, trim: true, maxlength: 120, default: '' },
  trackingUrl: { type: String, trim: true, maxlength: 500, default: '' },
  trackingEvents: [{ status: { type: String, maxlength: 80 }, note: { type: String, maxlength: 500 }, location: { type: String, maxlength: 160 }, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }]
}, { timestamps: true });

donationSchema.index({ status: 1, city: 1, createdAt: -1 });
donationSchema.index({ ngo: 1, status: 1, createdAt: -1 });
export default mongoose.model('Donation', donationSchema);
