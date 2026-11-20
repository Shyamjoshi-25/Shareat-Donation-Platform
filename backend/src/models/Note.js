
import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 4,
    maxlength: 140
  },
  category: {
    type: String,
    enum: ['Announcement', 'Suggestion', 'Update', 'Guideline'],
    default: 'Announcement',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 4000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  authorRole: {
    type: String,
    enum: ['admin', 'ngo'],
    required: true
  }
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);
