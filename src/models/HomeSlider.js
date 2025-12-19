const mongoose = require('mongoose');

const homeSliderSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  order: { type: Number, required: true, default: 0 },
}, { timestamps: true });

homeSliderSchema.index({ order: 1 });

module.exports = mongoose.model('HomeSlider', homeSliderSchema);
