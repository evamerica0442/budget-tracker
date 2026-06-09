import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const envelopeSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  budgetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    required: false // Optional - envelope can be linked to a category
  },
  color: {
    type: String,
    default: '#3498db',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly', 'one-time'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: false
  },
  autoRefill: {
    type: Boolean,
    default: true // Automatically refill at the start of each period
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique name per user
envelopeSchema.index({ name: 1, user: 1 }, { unique: true });

const Envelope = mongoose.model('Envelope', envelopeSchema);

export default Envelope;
