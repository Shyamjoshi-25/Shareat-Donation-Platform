import { Router } from 'express';
import crypto from 'node:crypto';
import Donation from '../models/Donation.js';
const router=Router();
router.post('/courier',async(req,res)=>{
 const configured=Buffer.from(process.env.COURIER_WEBHOOK_SECRET||'');const supplied=Buffer.from(req.headers['x-courier-secret']||'');
 if(!configured.length||!supplied.length||supplied.length!==configured.length||!crypto.timingSafeEqual(supplied,configured))return res.status(401).json({message:'Invalid courier webhook credentials.'});
 try{
  const {trackingCode,status,note,location}=req.body||{};if(typeof trackingCode!=='string'||!trackingCode.trim()||typeof status!=='string'||!status.trim())return res.status(400).json({message:'trackingCode and status are required.'});
  const donation=await Donation.findOne({trackingCode:trackingCode.trim()});if(!donation)return res.status(404).json({message:'No donation matches this tracking code.'});
  const eventStatus=status.trim().slice(0,80);donation.trackingEvents.push({status:eventStatus,note:String(note||'Courier update').slice(0,500),location:String(location||'').slice(0,160),at:new Date()});
  const mapped={'picked_up':'Collected','delivered':'Collected','collected':'Collected'}[eventStatus.toLowerCase().replaceAll(' ','_')];if(mapped&&['Pickup scheduled','Accepted'].includes(donation.status))donation.status='Collected';
  await donation.save();return res.json({received:true,donationId:donation._id,status:donation.status});
 }catch(e){return res.status(500).json({message:'Could not process courier update.'});}
});
export default router;
