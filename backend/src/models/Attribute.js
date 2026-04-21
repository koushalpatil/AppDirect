const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Attribute name is required'],
    trim: true,
    unique: true,
  },
  description: { type: String, trim: true },
  displayOnHomepage: { type: Boolean, default: false },
  requiredInProductEditor: { type: Boolean, default: false },
  showForFiltering: { type: Boolean, default: false },
  options: [{ type: String, trim: true }],
  linkedProductsCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Attribute', attributeSchema);
