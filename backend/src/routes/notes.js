
import { Router } from 'express';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();

const allowedCategories = [
  'Announcement',
  'Suggestion',
  'Update',
  'Guideline'
];

const populateAuthor = {
  path: 'author',
  select: 'name organization role'
};

// All Notes routes require login.
router.use(protect);

// Get all notes.
// Admin, NGO and donor accounts can read notes.
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find()
      .populate(populateAuthor)
      .sort({ createdAt: -1 });

    return res.json({ notes });
  } catch (error) {
    console.error('Load notes error:', error.message);
    return res.status(500).json({ message: 'Could not load notes.' });
  }
});

// Create a note.
// Only admins and NGOs can publish.
router.post('/', allow('admin', 'ngo'), async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string'
      ? req.body.title.trim() : '';

    const category = typeof req.body?.category === 'string'
      ? req.body.category.trim() : 'Announcement';

    const content = typeof req.body?.content === 'string'
      ? req.body.content.trim() : '';

    if (title.length < 4 || title.length > 140) {
      return res.status(400).json({
        message: 'Title must contain between 4 and 140 characters.'
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid note category.' });
    }

    if (content.length < 10 || content.length > 4000) {
      return res.status(400).json({
        message: 'Content must contain between 10 and 4000 characters.'
      });
    }

    const note = await Note.create({
      title,
      category,
      content,
      author: req.user._id,
      authorRole: req.user.role
    });

    await note.populate(populateAuthor);

    return res.status(201).json({
      message: 'Note published successfully.',
      note
    });
  } catch (error) {
    console.error('Create note error:', error.message);
    return res.status(500).json({ message: 'Could not publish note.' });
  }
});

// Update a note.
// Admin can update any note.
// NGO can update only their own notes.
router.patch('/:id', allow('admin', 'ngo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid note ID.' });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    if (
      req.user.role !== 'admin' &&
      note.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'You can only edit your own notes.'
      });
    }

    const title = typeof req.body?.title === 'string'
      ? req.body.title.trim() : '';

    const category = typeof req.body?.category === 'string'
      ? req.body.category.trim() : '';

    const content = typeof req.body?.content === 'string'
      ? req.body.content.trim() : '';

    if (title.length < 4 || title.length > 140) {
      return res.status(400).json({
        message: 'Title must contain between 4 and 140 characters.'
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid note category.' });
    }

    if (content.length < 10 || content.length > 4000) {
      return res.status(400).json({
        message: 'Content must contain between 10 and 4000 characters.'
      });
    }

    note.title = title;
    note.category = category;
    note.content = content;

    await note.save();
    await note.populate(populateAuthor);

    return res.json({
      message: 'Note updated successfully.',
      note
    });
  } catch (error) {
    console.error('Update note error:', error.message);
    return res.status(500).json({ message: 'Could not update note.' });
  }
});

// Delete a note.
// Admin can delete any note.
// NGO can delete only their own notes.
router.delete('/:id', allow('admin', 'ngo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid note ID.' });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    if (
      req.user.role !== 'admin' &&
      note.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'You can only delete your own notes.'
      });
    }

    await note.deleteOne();

    return res.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('Delete note error:', error.message);
    return res.status(500).json({ message: 'Could not delete note.' });
  }
});

export default router;
