import { Router } from 'express';
import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Donation from '../models/Donation.js';
import { protect, allow } from '../middleware/auth.js';
const router=Router(); router.use(protect);
router.post('/', allow('donor','ngo'), async(req,res)=>{
 try {
  const subject=String(req.body?.subject||'').trim(), description=String(req.body?.description||'').trim(), category=req.body?.category||'Other';
  if(subject.length<4||subject.length>140||description.length<10||description.length>3000) return res.status(400).json({message:'Enter a subject (4–140 characters) and description (10–3000 characters).'});
  let donation=null; if(req.body?.donationId){ if(!mongoose.isValidObjectId(req.body.donationId)) return res.status(400).json({message:'Invalid donation reference.'}); donation=await Donation.findById(req.body.donationId); if(!donation) return res.status(404).json({message:'Donation not found.'}); if(req.user.role==='donor'&&String(donation.donor)!==String(req.user._id)) return res.status(403).json({message:'You can only report your own donation.'}); if(req.user.role==='ngo'&&String(donation.ngo)!==String(req.user._id)) return res.status(403).json({message:'You can only report a donation assigned to your NGO.'}); }
  const complaint=await Complaint.create({createdBy:req.user._id,donation:donation?donation._id:null,subject,description,category}); return res.status(201).json({complaint});
 }catch(e){return res.status(500).json({message:'Could not submit complaint.'});}
});
router.get('/', async(req,res)=>{ try { const filter=req.user.role==='admin'?{}:{createdBy:req.user._id}; const complaints=await Complaint.find(filter).populate('createdBy','name email role').populate('donation','title status').sort({createdAt:-1}); return res.json({complaints}); }catch(e){return res.status(500).json({message:'Could not load complaints.'});} });
router.patch('/:id',allow('admin'),async(req,res)=>{ try { if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid complaint ID.'}); const status=req.body?.status, adminResponse=String(req.body?.adminResponse||'').trim(); if(!['Open','In review','Resolved','Closed'].includes(status))return res.status(400).json({message:'Invalid complaint status.'}); if(adminResponse.length>3000)return res.status(400).json({message:'Response is too long.'}); const complaint=await Complaint.findByIdAndUpdate(req.params.id,{$set:{status,adminResponse,resolvedAt:['Resolved','Closed'].includes(status)?new Date():null}},{new:true,runValidators:true}).populate('createdBy','name email role').populate('donation','title status'); if(!complaint)return res.status(404).json({message:'Complaint not found.'}); return res.json({complaint}); }catch(e){return res.status(500).json({message:'Could not update complaint.'});} });
export default router;
