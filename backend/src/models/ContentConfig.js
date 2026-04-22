const mongoose = require('mongoose');

const contactOptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const contactValidationSchema = new mongoose.Schema({
  minLength: { type: Number },
  maxLength: { type: Number },
  regex: { type: String },
  min: { type: Number },
  max: { type: Number },
  step: { type: Number },
  minDate: { type: String },
  maxDate: { type: String },
}, { _id: false });

const contactFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox', 'date', 'file', 'tel'],
    default: 'text',
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  helpText: { type: String },
  options: [contactOptionSchema],
  validations: { type: contactValidationSchema, default: () => ({}) },
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
