import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
const router = Router(); router.use(protect);
const safe = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '', city: u.city || '', organization: u.organization || '', verified: !!u.verified, profileImage: u.profileImage || '' });
router.patch('/', async (req,res) => {
 try {
  const allowed = ['name','phone','address','city','organization','profileImage']; const update = {};
  for (const key of allowed) if (req.body?.[key] !== undefined) update[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : '';
  if (!update.name && req.body?.name !== undefined) return res.status(400).json({message:'Name is required.'});
  if (update.name && (update.name.length < 2 || update.name.length > 100)) return res.status(400).json({message:'Name must be between 2 and 100 characters.'});
  if (req.user.role !== 'ngo') delete update.organization;
  if (update.profileImage && (!/^data:image\/(png|jpeg|webp);base64,/.test(update.profileImage) || update.profileImage.length > 1400000)) return res.status(400).json({message:'Profile image must be PNG, JPG or WebP and under 1 MB.'});
  for (const [k,max] of Object.entries({phone:30,address:250,city:100,organization:150})) if (update[k] && update[k].length > max) return res.status(400).json({message:`${k} is too long.`});
  const user = await User.findByIdAndUpdate(req.user._id, {$set:update}, {new:true,runValidators:true});
  return res.json({user:safe(user)});
 } catch(e) { return res.status(400).json({message:e.name==='ValidationError'?'Please check your profile details.':'Could not update profile.'}); }
});
router.patch('/password', async (req,res) => {
 try {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({message:'New password must contain between 8 and 128 characters.'});
  const user = await User.findById(req.user._id).select('+password');
  if (!await bcrypt.compare(String(currentPassword || ''), user.password)) return res.status(400).json({message:'Current password is incorrect.'});
  user.password = await bcrypt.hash(newPassword,12); await user.save();
  return res.json({message:'Password changed successfully.'});
 } catch(e) { return res.status(500).json({message:'Could not change password.'}); }
});
export default router;
