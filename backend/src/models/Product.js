const mongoose = require('mongoose');

const overviewSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  screenshots: [{ type: String }],
}, { _id: true });

const featureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  screenshots: [{ type: String }],
}, { _id: true });

const productSchema = new mongoose.Schema({
  // Stage 1: Define Product
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 200,
  },

  // Stage 2: Listing Information
  tagline: { type: String, trim: true, maxlength: 300 },
  developerName: { type: String, trim: true, maxlength: 100 },
  logo: { type: String },
  tags: [{ type: String, trim: true }],
  overview: [overviewSchema],
  features: [featureSchema],

  // Stage 3: Product Information
  attributes: [{
    attributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },
    attributeName: { type: String },
    values: [{ type: String }],
  }],
  supportDescription: { type: String },
  policies: { type: String },
  resources: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
  }],

  // Metadata
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

productSchema.index({ name: 'text', tagline: 'text', tags: 'text' });
productSchema.index({ status: 1 });
productSchema.index({ 'attributes.attributeId': 1 });

module.exports = mongoose.model('Product', productSchema);
