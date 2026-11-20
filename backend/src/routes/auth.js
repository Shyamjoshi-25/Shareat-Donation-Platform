import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';

const router = Router();
const tokenFor = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  address: user.address || '',
  city: user.city || '',
  organization: user.organization || '',
  verified: Boolean(user.verified),
  profileImage: user.profileImage || ''
});
const cleanText = value => typeof value === 'string' ? value.trim() : '';

router.post('/register', authRateLimit({ max: 8 }), async (req, res) => {
  try {
    const name = cleanText(req.body?.name);
    const email = cleanText(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role || 'donor';
    const phone = cleanText(req.body?.phone);
    const address = cleanText(req.body?.address);
    const city = cleanText(req.body?.city);
    const organization = cleanText(req.body?.organization);

    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (name.length > 100 || email.length > 254 || phone.length > 30 || address.length > 250 || city.length > 100 || organization.length > 150) {
      return res.status(400).json({ message: 'One or more fields exceed the allowed length.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain between 8 and 128 characters.' });
    if (!['donor', 'ngo'].includes(role)) return res.status(400).json({ message: 'Invalid account type.' });
    if (role === 'ngo' && !organization) return res.status(400).json({ message: 'Organization name is required for NGO accounts.' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({
      name, email, password: await bcrypt.hash(password, 12), role, phone, address, city,
      organization, verified: role === 'donor'
    });
    return res.status(201).json({ token: tokenFor(user._id), user: safe(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (error?.name === 'ValidationError') return res.status(400).json({ message: 'Please check the information you entered.' });
    console.error('Registration error:', error.message);
    return res.status(500).json({ message: 'Could not create account.' });
  }
});

router.post('/login', authRateLimit({ max: 10 }), async (req, res) => {
  try {
    const email = cleanText(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({ token: tokenFor(user._id), user: safe(user) });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

router.get('/me', protect, (req, res) => res.json({ user: safe(req.user) }));
export default router;
