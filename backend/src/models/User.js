import {encryptField,decryptField} from '../utils/fieldEncryption.js';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, minlength: 20, select: false },
  role: { type: String, enum: ['donor', 'ngo', 'admin'], default: 'donor' },
  phone: { type: String, trim: true, maxlength: 500, set: encryptField, get: decryptField },
  address: { type: String, trim: true, maxlength: 1000, set: encryptField, get: decryptField },
  city: { type: String, trim: true, maxlength: 100 },
  organization: { type: String, trim: true, maxlength: 150 },
  verified: { type: Boolean, default: false },
  profileImage: { type: String, default: '', maxlength: 1400000 }
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

export default mongoose.model('User', userSchema);
