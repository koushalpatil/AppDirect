const Attribute = require('../models/Attribute');
const Product = require('../models/Product');

// Create a new attribute
exports.createAttribute = async (req, res) => {
  try {
    const { name, description, displayOnHomepage, requiredInProductEditor, showForFiltering, options, similarity } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Attribute name is required.' });
    }

    const existing = await Attribute.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(409).json({ message: 'An attribute with this name already exists.' });
    }

    if (similarity && similarity.weight !== undefined) {
      const w = Number(similarity.weight);
      if (isNaN(w) || w < 0 || w > 10) {
        return res.status(400).json({ message: 'Similarity weight must be between 0 and 10.' });
      }
    }

    const attribute = await Attribute.create({
      name: name.trim(),
      description,
      displayOnHomepage: displayOnHomepage || false,
      requiredInProductEditor: requiredInProductEditor || false,
      showForFiltering: showForFiltering || false,
      options: options || [],
      similarity: similarity || {
        useInSimilarity: false,
        weight: 1,
        matchType: 'exact',
      },
    });

    res.status(201).json({ message: 'Attribute created successfully.', attribute });
  } catch (error) {
    console.error('Create attribute error:', error);
    res.status(500).json({ message: 'Failed to create attribute.' });
  }
};

// Get all attributes
exports.getAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find().sort({ name: 1 });

    // Count linked products for each attribute
    const attributesWithCounts = await Promise.all(
      attributes.map(async (attr) => {
        const count = await Product.countDocuments({
          'attributes.attributeId': attr._id,
          status: 'published',
        });
        const attrObj = attr.toObject();
        attrObj.linkedProductsCount = count;
        return attrObj;
      })
    );

    res.json({ attributes: attributesWithCounts });
  } catch (error) {
    console.error('Get attributes error:', error);
    res.status(500).json({ message: 'Failed to retrieve attributes.' });
  }
};

// Get single attribute
exports.getAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }
    res.json({ attribute });
  } catch (error) {
    console.error('Get attribute error:', error);
    res.status(500).json({ message: 'Failed to retrieve attribute.' });
  }
};

// Update an attribute
exports.updateAttribute = async (req, res) => {
  try {
    const { name, description, displayOnHomepage, requiredInProductEditor, showForFiltering, options, similarity } = req.body;

    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }

    if (name !== undefined) {
      const existing = await Attribute.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({ message: 'An attribute with this name already exists.' });
      }
      attribute.name = name.trim();
    }
    if (description !== undefined) attribute.description = description;
    if (displayOnHomepage !== undefined) attribute.displayOnHomepage = displayOnHomepage;
    if (requiredInProductEditor !== undefined) attribute.requiredInProductEditor = requiredInProductEditor;
    if (showForFiltering !== undefined) attribute.showForFiltering = showForFiltering;
    if (options !== undefined) attribute.options = options;
    if (similarity !== undefined) {
      if (similarity.weight !== undefined) {
        const w = Number(similarity.weight);
        if (isNaN(w) || w < 0 || w > 10) {
          return res.status(400).json({ message: 'Similarity weight must be between 0 and 10.' });
        }
      }
      attribute.similarity = {
        ...attribute.similarity,
        ...similarity,
      };
    }

    await attribute.save();
    res.json({ message: 'Attribute updated successfully.', attribute });
  } catch (error) {
    console.error('Update attribute error:', error);
    res.status(500).json({ message: 'Failed to update attribute.' });
  }
};

// Delete an attribute
exports.deleteAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }

    if (attribute.name.toLowerCase() === 'category') {
      return res.status(403).json({ message: 'The standard Category attribute cannot be deleted.' });
    }

    // Check if any products use this attribute
    const linkedProducts = await Product.countDocuments({ 'attributes.attributeId': req.params.id });
    if (linkedProducts > 0) {
      return res.status(409).json({
        message: `Cannot delete. ${linkedProducts} product(s) are using this attribute.`,
      });
    }

    await Attribute.findByIdAndDelete(req.params.id);
    res.json({ message: 'Attribute deleted successfully.' });
  } catch (error) {
    console.error('Delete attribute error:', error);
    res.status(500).json({ message: 'Failed to delete attribute.' });
  }
};
