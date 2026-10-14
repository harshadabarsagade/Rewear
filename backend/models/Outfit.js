
import mongoose from 'mongoose';

const outfitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  occasion: {
    type: String,
    enum: ['Casual', 'College', 'Party', 'Festive', 'Formal', 'Any'],
    default: 'Any',
  },

  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clothing',
    required: true,
  }],
}, {
  timestamps: true,
});

export default mongoose.model('Outfit', outfitSchema);
