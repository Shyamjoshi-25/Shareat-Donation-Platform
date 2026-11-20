import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();
router.use(protect, allow('admin'));

router.get('/overview', async (req, res) => {
  try {
    const [users, ngos, pending, donations, distributed] = await Promise.all([
      User.countDocuments({ role: { $in: ['donor', 'ngo'] } }),
      User.countDocuments({ role: 'ngo' }),
      Donation.countDocuments({ status: 'Pending' }),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'Distributed' })
    ]);
    return res.json({ stats: { users, ngos, pending, donations, distributed } });
  } catch (error) {
    console.error('Admin overview error:', error.message);
    return res.status(500).json({ message: 'Could not load platform statistics.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const role = ['all', 'donor', 'ngo'].includes(req.query.role) ? req.query.role : 'all';
    const search = String(req.query.search || '').trim().slice(0, 100);
    const filter = { role: role === 'all' ? { $in: ['donor', 'ngo'] } : role };
    if (search) filter.$or = [
      { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { organization: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { city: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    ];
    const [users, total] = await Promise.all([
      User.find(filter).select('name email role phone city organization verified createdAt').sort({ createdAt: -1 }).limit(250),
      User.countDocuments(filter)
    ]);
    return res.json({ users, total });
  } catch (error) {
    console.error('Admin users error:', error.message);
    return res.status(500).json({ message: 'Could not load platform accounts.' });
  }
});

router.patch('/users/:id/verify', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid NGO account ID.' });
    if (typeof req.body?.verified !== 'boolean') return res.status(400).json({ message: 'The verified field must be true or false.' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'ngo' },
      { $set: { verified: req.body.verified } },
      { new: true, runValidators: true, projection: 'name email role organization verified city' }
    );
    if (!user) return res.status(404).json({ message: 'NGO not found.' });
    return res.json({ user });
  } catch (error) {
    console.error('NGO verification error:', error.message);
    return res.status(500).json({ message: 'Could not update NGO verification.' });
  }
});

router.get('/donations', async (req, res) => {
  try {
    const filter = {}; if(req.query.city) filter.city=String(req.query.city).slice(0,100);
    const donations = await Donation.find(filter).limit(1000)
      .populate('donor', 'name email')
      .populate('ngo', 'name organization')
      .sort({ createdAt: -1 });
    return res.json({ donations });
  } catch (error) {
    console.error('Admin donations error:', error.message);
    return res.status(500).json({ message: 'Could not load donations.' });
  }
});

export default router;
