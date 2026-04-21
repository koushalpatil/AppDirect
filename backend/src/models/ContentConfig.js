const mongoose = require('mongoose');

const contactFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'email', 'tel', 'textarea', 'select', 'number'],
    default: 'text',
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  options: [{ type: String }], // for select type
  isDefault: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: true });

const homepageCategorySchema = new mongoose.Schema({
  categoryAttributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },
  categoryName: { type: String },
  categoryValue: { type: String },
  title: { type: String },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  order: { type: Number, default: 0 },
}, { _id: true });

const contentConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['contact_form', 'homepage'],
    required: true,
    unique: true,
  },

  // Contact form fields
  contactFields: [contactFieldSchema],

  // Homepage config
  heroImage: { type: String },
  slidingImages: [{ type: String }],
  homepageCategories: [homepageCategorySchema],

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ContentConfig', contentConfigSchema);
