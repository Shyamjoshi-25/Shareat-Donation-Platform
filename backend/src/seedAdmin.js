import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 128) {
  console.error('ADMIN_PASSWORD must contain between 12 and 128 characters.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim())) {
  console.error('ADMIN_EMAIL must be a valid email address.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email }).select('+password');
  if (existing) {
    if (existing.role !== 'admin') {
      console.error('That email is already registered to a non-admin account. Choose a different ADMIN_EMAIL.');
      process.exitCode = 1;
    } else {
      console.log('An admin account with this email already exists. No changes made.');
    }
  } else {
    await User.create({
      name: 'Shareat Admin', email,
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'admin', verified: true
    });
    console.log(`Admin account created for ${email}. Keep the password private.`);
  }
} catch (error) {
  console.error('Could not create admin account:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
