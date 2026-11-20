import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name:{type:String,required:true,unique:true,trim:true,maxlength:80}, itemTypes:[{type:String,trim:true,maxlength:80}], active:{type:Boolean,default:true} },{timestamps:true});
schema.index({active:1,name:1}); export default mongoose.model('Category',schema);
