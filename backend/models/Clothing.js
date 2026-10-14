import mongoose from 'mongoose';

const clothingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['Tops', 'Bottoms', 'Dresses', 'Ethnic Wear', 'Footwear', 'Accessories'],
  },
  color: { type: String, required: true, trim: true },
  occasion: {
    type: String,
    enum: ['Casual', 'College', 'Party', 'Festive', 'Formal', 'Any'],
    default: 'Any',
  },
  image: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Clothing', clothingSchema);