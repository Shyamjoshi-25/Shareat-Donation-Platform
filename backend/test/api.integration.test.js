import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Complaint from '../src/models/Complaint.js';

 test('API integration: register, login, profile, password and complaints', { skip: !process.env.TEST_MONGODB_URI && 'Set TEST_MONGODB_URI to an isolated MongoDB test database.' }, async t => {
  const port=Number(process.env.TEST_API_PORT||5189), base=`http://127.0.0.1:${port}/api`, secret='test-only-secret-012345678901234567890123';
  const child=spawn(process.execPath,['src/server.js'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),MONGODB_URI:process.env.TEST_MONGODB_URI,JWT_SECRET:secret,PII_ENCRYPTION_KEY:'0123456789abcdef'.repeat(4),CLIENT_URL:`http://localhost:5173`},stdio:'ignore'});
  let userId=null, ngoId=null;
  async function request(path,options={}){const r=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(options.token?{Authorization:`Bearer ${options.token}`}:{})},body:options.body?JSON.stringify(options.body):undefined});const data=await r.json();assert.ok(r.ok,`${path}: ${data.message||r.status}`);return data;}
  try{
   let healthy=false;for(let i=0;i<40;i++){try{const r=await fetch(base+'/health');if(r.ok){healthy=true;break;}}catch{}await delay(500);}assert.ok(healthy,'API did not start');
   const email=`integration-${Date.now()}@shareat.test`;
   const registered=await request('/auth/register',{method:'POST',body:{name:'Integration Donor',email,password:'Testing@12345',role:'donor'}});const token=registered.token;userId=registered.user.id;assert.equal(registered.user.role,'donor');
   const ngoEmail=`integration-ngo-${Date.now()}@shareat.test`;const ngo=await request('/auth/register',{method:'POST',body:{name:'Integration NGO',organization:'Integration NGO',email:ngoEmail,password:'Testing@12345',role:'ngo',city:'Nashik'}});ngoId=ngo.user.id;await mongoose.connect(process.env.TEST_MONGODB_URI);await User.findByIdAndUpdate(ngoId,{$set:{verified:true}});await mongoose.disconnect();
   const login=await request('/auth/login',{method:'POST',body:{email,password:'Testing@12345'}});assert.ok(login.token);
   const profile=await request('/profile',{method:'PATCH',token,body:{name:'Updated Donor',city:'Nashik',profileImage:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='}});assert.equal(profile.user.name,'Updated Donor');assert.equal(profile.user.city,'Nashik');assert.ok(profile.user.profileImage.startsWith('data:image/png'));
   const donation=await request('/donations',{method:'POST',token,body:{title:'Integration test clothes',category:'Clothes',description:'Test donation item',quantity:2,unit:'Pieces',condition:'Good',pickupAddress:'Test address',city:'Nashik',ngo:ngoId}});assert.ok(donation.donation._id);assert.equal(donation.donation.unit,'Pieces');
   const food=await request('/donations',{method:'POST',token,body:{title:'Packed rice',category:'Food & groceries',description:'Sealed rice bag',quantity:2.5,unit:'Kg',condition:'Sealed / packed',expiryDate:'2027-12-31',pickupAddress:'Test address',city:'Nashik',ngo:ngoId}});assert.equal(food.donation.quantity,2.5);assert.equal(food.donation.unit,'Kg');assert.equal(food.donation.condition,'Sealed / packed');assert.ok(food.donation.expiryDate);
   const tracking=await request(`/tracking/${donation.donation._id}`,{token});assert.equal(tracking.tracking.status,'Pending');
   const complaint=await request('/complaints',{method:'POST',token,body:{donationId:donation.donation._id,subject:'Pickup delay',category:'Pickup issue',description:'The collection has not arrived on the scheduled date.'}});assert.equal(complaint.complaint.status,'Open');
   const listed=await request('/complaints',{token});assert.ok(listed.complaints.some(c=>c._id===complaint.complaint._id));
   const changed=await request('/profile/password',{method:'PATCH',token,body:{currentPassword:'Testing@12345',newPassword:'NewTesting@12345'}});assert.match(changed.message,/changed/);
   const newLogin=await request('/auth/login',{method:'POST',body:{email,password:'NewTesting@12345'}});assert.ok(newLogin.token);
  } finally {if(userId||ngoId){await mongoose.connect(process.env.TEST_MONGODB_URI).catch(()=>{});await Complaint.deleteMany({createdBy:userId}).catch(()=>{});await User.deleteMany({_id:{$in:[userId,ngoId].filter(Boolean)}}).catch(()=>{});await mongoose.disconnect().catch(()=>{});}child.kill('SIGTERM');}
 });
