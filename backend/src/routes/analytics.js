import { Router } from 'express';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import Review from '../models/Review.js';
import { protect, allow } from '../middleware/auth.js';
const router=Router(); router.use(protect,allow('admin'));
router.get('/export.csv',async(req,res)=>{try{const rows=await Donation.find().populate('donor','name email').populate('ngo','organization name').sort({createdAt:-1}).limit(10000).lean();const esc=v=>'\"'+String(v??'').replaceAll('\"','\"\"')+'\"';const csv=['Title,Category,Quantity,City,Donor,NGO,Status,Created At',...rows.map(d=>[d.title,d.category,`${d.quantity} ${d.unit}`,d.city,d.donor?.name,d.ngo?.organization||d.ngo?.name,d.status,d.createdAt?.toISOString()].map(esc).join(','))].join('\n');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename=shareat-donations.csv');res.send(csv);}catch(e){res.status(500).json({message:'Could not export report.'});}});
router.get('/',async(req,res)=>{try{
 const [users,ngos,verifiedNgos,donations,statuses,complaints,monthly,categories,reviews,repeatDonors,completed]=await Promise.all([
  User.countDocuments({role:'donor'}),User.countDocuments({role:'ngo'}),User.countDocuments({role:'ngo',verified:true}),Donation.countDocuments(),
  Donation.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),Complaint.countDocuments(),
  Donation.aggregate([{$match:{createdAt:{$gte:new Date(new Date().getFullYear(),new Date().getMonth()-5,1)}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},count:{$sum:1}}},{$sort:{_id:1}}]),
  Donation.aggregate([{$group:{_id:'$category',count:{$sum:1}}},{$sort:{count:-1}}]),
  Review.aggregate([{$group:{_id:null,avg:{$avg:'$rating'},count:{$sum:1}}}]),
  Donation.aggregate([{$group:{_id:'$donor',count:{$sum:1}}},{$match:{count:{$gt:1}}},{$count:'count'}]),
  Donation.aggregate([{$match:{status:{$in:['Collected','Distributed']}}},{$project:{collectedEvent:{$first:{$filter:{input:'$trackingEvents',as:'event',cond:{$eq:['$$event.status','Collected']}}}} ,createdAt:1}},{$match:{collectedEvent:{$ne:null}}},{$project:{duration:{$subtract:['$collectedEvent.at','$createdAt']}}},{$group:{_id:null,avg:{$avg:'$duration'}}}])
 ]);
 const statusCounts=Object.fromEntries(statuses.map(x=>[x._id,x.count]));
 return res.json({analytics:{users,ngos,verifiedNgos,donations,complaints,distributed:statusCounts.Distributed||0,collectionRate:donations?Math.round(((statusCounts.Collected||0)+(statusCounts.Distributed||0))/donations*100):0,repeatDonationRate:users?Math.round(((repeatDonors[0]?.count||0)/users)*100):0,averageRating:Math.round((reviews[0]?.avg||0)*10)/10,ratingCount:reviews[0]?.count||0,averageCollectionHours:Math.round((completed[0]?.avg||0)/3600000*10)/10,statuses:statusCounts,monthly,categories}});
 }catch(e){return res.status(500).json({message:'Could not generate analytics.'});}});
export default router;
