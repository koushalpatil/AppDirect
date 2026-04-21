const Product = require('../models/Product');
const ProductEditLog = require('../models/ProductEditLog');

// Create a new product (draft or published)
exports.createProduct = async (req, res) => {
  try {
    const {
      name, tagline, developerName, logo, tags,
      overview, features, attributes,
      supportDescription, policies, status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required.' });
    }

    const product = await Product.create({
      name: name.trim(),
      tagline,
      developerName,
      logo,
      tags: tags || [],
      overview: overview || [],
      features: features || [],
      attributes: attributes || [],
      supportDescription,
      policies,
      status: status || 'draft',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Log creation
    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action: 'created',
      changes: { status: product.status },
    });

    res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product.' });
  }
};

// Get all products (with optional filters)
exports.getProducts = async (req, res) => {
  try {
    const { status, search, attributeId, attributeValue, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    if (attributeId && attributeValue) {
      filter['attributes'] = {
        $elemMatch: {
          attributeId,
          values: attributeValue,
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Get single product by ID
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('attributes.attributeId', 'name options');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to retrieve product.' });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Capture previous values for edit log
    const previousValues = {};
    const changes = {};
    const updateFields = [
      'name', 'tagline', 'developerName', 'logo', 'tags',
      'overview', 'features', 'attributes',
      'supportDescription', 'policies', 'status',
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        previousValues[field] = product[field];
        changes[field] = req.body[field];
        product[field] = req.body[field];
      }
    });

    product.updatedBy = req.user._id;
    await product.save();

    // Determine action type
    let action = 'updated';
    if (changes.status === 'published' && previousValues.status === 'draft') {
      action = 'published';
    } else if (changes.status === 'draft' && previousValues.status === 'published') {
      action = 'unpublished';
    }

    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action,
      changes,
      previousValues,
    });

    res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product.' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action: 'deleted',
      previousValues: product.toObject(),
    });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product.' });
  }
};

// Get edit logs for a product
exports.getProductLogs = async (req, res) => {
  try {
    const logs = await ProductEditLog.find({ productId: req.params.id })
      .populate('editedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (error) {
    console.error('Get product logs error:', error);
    res.status(500).json({ message: 'Failed to retrieve product logs.' });
  }
};

// Get published products for public/user view
exports.getPublishedProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { status: 'published' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select('-createdBy -updatedBy')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get published products error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Get products by attribute value (for homepage categories)
exports.getProductsByAttribute = async (req, res) => {
  try {
    const { attributeId, value } = req.query;
    const filter = { status: 'published' };

    if (attributeId && value) {
      filter['attributes'] = {
        $elemMatch: {
          attributeId,
          values: value,
        },
      };
    }

    const products = await Product.find(filter)
      .select('name tagline logo tags')
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({ products });
  } catch (error) {
    console.error('Get products by attribute error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};
