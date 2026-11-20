import { Router } from 'express';
import mongoose from 'mongoose';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { protect, allow } from '../middleware/auth.js';
import { validDonationStatuses, canTransitionDonation } from '../domain/donationWorkflow.js';

const router = Router();
router.use(protect);
const text = value => typeof value === 'string' ? value.trim() : '';

router.post('/', allow('donor'), async (req, res) => {
  try {
    const title = text(req.body?.title);
    const category = text(req.body?.category);
    const description = text(req.body?.description);
    const pickupAddress = text(req.body?.pickupAddress);
    const city = text(req.body?.city);
    const condition = req.body?.condition || 'Good';
    const quantity = Number(req.body?.quantity);
    const unit = text(req.body?.unit || 'Pieces');
    const expiryDate = req.body?.expiryDate ? new Date(req.body.expiryDate) : null;
    const pickupDate = req.body?.pickupDate ? new Date(req.body.pickupDate) : null;
    const categories = await Category.find({active:true}).select('name').lean();
    const categoryNames = categories.map(c=>c.name);
    const units = ['Pieces', 'Pairs', 'Kg', 'Litres', 'Packets / boxes', 'Sets'];
    const conditions = ['New', 'Like new', 'Good', 'Usable'];
    const isFood = category === 'Food & groceries';
    if (!title || !category || !pickupAddress || !city || !Number.isFinite(quantity)) {
      return res.status(400).json({ message: 'Please complete all required donation details.' });
    }
    if (title.length > 120 || description.length > 1200 || pickupAddress.length > 250 || city.length > 100) {
      return res.status(400).json({ message: 'One or more fields exceed the allowed length.' });
    }
    if (!categoryNames.includes(category) || !units.includes(unit)) return res.status(400).json({ message: 'Invalid donation category or quantity unit.' });
    if (isFood ? condition !== 'Sealed / packed' : !conditions.includes(condition)) return res.status(400).json({ message: 'Choose a valid condition for this donation category.' });
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500 || (!['Kg', 'Litres'].includes(unit) && !Number.isInteger(quantity)) || (['Kg', 'Litres'].includes(unit) && Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-8)) return res.status(400).json({ message: 'Quantity must be 1 to 500. Decimals (up to 2 places) are allowed only for Kg and Litres.' });
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (isFood && (!expiryDate || Number.isNaN(expiryDate.getTime()) || expiryDate < today)) return res.status(400).json({ message: 'Food donations must have a valid expiry date that is today or later.' });
    if (!isFood && expiryDate) return res.status(400).json({ message: 'Expiry dates are only used for food donations.' });
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    if (pickupDate && (Number.isNaN(pickupDate.getTime()) || pickupDate < todayUtc)) {
      return res.status(400).json({ message: 'Pickup date must be a valid date today or later.' });
    }
    const ngoId = req.body?.ngo;
    if (!ngoId || !mongoose.isValidObjectId(ngoId)) return res.status(400).json({message:'Select a verified NGO for collection.'});
    const selectedNgo = await User.findOne({_id:ngoId,role:'ngo',verified:true});
    if (!selectedNgo) return res.status(400).json({message:'Selected NGO is not verified or no longer available.'});
    if (selectedNgo.city && selectedNgo.city.toLowerCase() !== city.toLowerCase()) return res.status(400).json({message:'Select an NGO serving your donation city.'});
    const donation = await Donation.create({ donor: req.user._id, ngo:selectedNgo._id, title, category, description, quantity, unit, condition, expiryDate, pickupAddress, city, pickupDate });
    await Notification.create({user:selectedNgo._id,title:'New donation request',message:`${title} has been assigned to your NGO in ${city}.`,type:'donation',donation:donation._id});
    return res.status(201).json({ donation });
  } catch (error) {
    if (error?.name === 'ValidationError') return res.status(400).json({ message: 'Please check the donation details.' });
    console.error('Create donation error:', error.message);
    return res.status(500).json({ message: 'Could not create donation.' });
  }
});

router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'donor') filter = { donor: req.user._id };
    if (req.user.role === 'ngo') { filter = { ngo: req.user._id }; if(req.query.city) filter.city=String(req.query.city).slice(0,100); }
    if(req.user.role==='admin' && req.query.city) filter.city=String(req.query.city).slice(0,100);
    const page=Math.max(1,Number.parseInt(req.query.page||'1',10)||1);
    const limit=Math.min(100,Math.max(1,Number.parseInt(req.query.limit||'100',10)||100));
    const [donations,total]=await Promise.all([Donation.find(filter).populate('donor','name city').populate('ngo','name organization').sort({createdAt:-1}).skip((page-1)*limit).limit(limit),Donation.countDocuments(filter)]);
    return res.json({ donations, total, page, pages:Math.ceil(total/limit) });
  } catch (error) {
    console.error('List donations error:', error.message);
    return res.status(500).json({ message: 'Could not load donations.' });
  }
});

router.patch('/:id/status', allow('ngo', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid donation ID.' });
    const requestedStatus = req.body?.status;
    if (!validDonationStatuses.includes(requestedStatus)) return res.status(400).json({ message: 'Invalid donation status.' });
    if (req.user.role === 'ngo' && !req.user.verified) return res.status(403).json({ message: 'Your NGO account is awaiting admin verification.' });
    const existing = await Donation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Donation not found.' });
    if (req.user.role === 'ngo') {
      if (String(existing.ngo || '') !== String(req.user._id)) return res.status(403).json({ message: 'This donation is not assigned to your NGO.' });
      if (!canTransitionDonation(existing.status, requestedStatus)) {
        return res.status(409).json({ message: `Cannot change a ${existing.status} donation to ${requestedStatus}. Follow the donation workflow.` });
      }
      if (existing.status === 'Pending' && requestedStatus !== 'Accepted' && requestedStatus !== 'Rejected') {
        return res.status(409).json({ message: 'An NGO must accept a donation before updating it.' });
      }
    } else if (existing.status !== requestedStatus && !canTransitionDonation(existing.status, requestedStatus)) {
      return res.status(409).json({ message: `Invalid status transition from ${existing.status} to ${requestedStatus}.` });
    }

    const filter = { _id: existing._id, status: existing.status };
    if (req.user.role === 'ngo') {
      filter.$or = [{ ngo: req.user._id }, { ngo: null, status: 'Pending' }];
    }
    const update = { $set: { status: requestedStatus }, $push: { trackingEvents: { status: requestedStatus, note: `Donation status updated to ${requestedStatus}`, at: new Date(), by: req.user._id } } };

    if (req.body?.ngoNote !== undefined) {
      const ngoNote = text(req.body.ngoNote);
      if (ngoNote.length > 1000) return res.status(400).json({ message: 'NGO note cannot exceed 1000 characters.' });
      if (req.user.role === 'ngo') update.$set.ngoNote = ngoNote;
    }
    const donation = await Donation.findOneAndUpdate(filter, update, { new: true, runValidators: true })
      .populate('donor', 'name city').populate('ngo', 'name organization');
    if (!donation) return res.status(409).json({ message: 'This donation was updated by someone else. Refresh and try again.' });
    if(donation?.donor?._id) await Notification.create({user:donation.donor._id,title:'Donation status updated',message:`Your donation ${donation.title} is now ${requestedStatus}.`,type:'status',donation:donation._id});
    return res.json({ donation });
  } catch (error) {
    console.error('Update donation status error:', error.message);
    return res.status(500).json({ message: 'Could not update donation status.' });
  }
});

router.post('/:id/review',allow('donor'),async(req,res)=>{try{const donation=await Donation.findOne({_id:req.params.id,donor:req.user._id,status:'Distributed'});if(!donation||!donation.ngo)return res.status(400).json({message:'Only distributed donations can be reviewed.'});const rating=Number(req.body?.rating);if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({message:'Rating must be from 1 to 5.'});const review=await Review.findOneAndUpdate({donation:donation._id},{$set:{donor:req.user._id,ngo:donation.ngo,rating,comment:String(req.body?.comment||'').slice(0,1000)}},{upsert:true,new:true,runValidators:true});return res.json({review});}catch(e){return res.status(500).json({message:'Could not save your review.'});}});

router.delete('/:id', allow('donor', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid donation ID.' });
    const filter = { _id: req.params.id };
    if (req.user.role === 'donor') filter.donor = req.user._id;
    const donation = await Donation.findOne(filter);
    if (!donation) return res.status(404).json({ message: 'Donation not found.' });
    if (donation.status !== 'Pending' && req.user.role !== 'admin') return res.status(400).json({ message: 'Only pending donations can be withdrawn.' });
    const deleted = await Donation.findOneAndDelete({ _id: donation._id, status: 'Pending', ...(req.user.role === 'donor' ? { donor: req.user._id } : {}) });
    if (!deleted && req.user.role !== 'admin') return res.status(409).json({ message: 'This donation has changed and can no longer be withdrawn.' });
    if (!deleted && req.user.role === 'admin') await Donation.findByIdAndDelete(donation._id);
    return res.json({ message: 'Donation removed.' });
  } catch (error) {
    console.error('Delete donation error:', error.message);
    return res.status(500).json({ message: 'Could not remove donation.' });
  }
});

export default router;
