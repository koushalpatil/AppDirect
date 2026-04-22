const Product = require('../models/Product');
const Attribute = require('../models/Attribute');
const ProductEditLog = require('../models/ProductEditLog');

// Create a new product (draft or published)
exports.createProduct = async (req, res) => {
  try {
    const {
      name, tagline, developerName, logo, tags,
      overview, features, attributes,
      supportDescription, policies, resources, status,
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
      resources: resources || [],
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
      'supportDescription', 'policies', 'resources', 'status',
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
        { developerName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select('-createdBy -updatedBy')
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering')
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
      .select('name tagline logo tags developerName')
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({ products });
  } catch (error) {
    console.error('Get products by attribute error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Production-level search with multi-attribute filtering
exports.searchProducts = async (req, res) => {
  try {
    const { search, filters, page = 1, limit = 20 } = req.query;
    const filter = { status: 'published' };

    // Text search across multiple fields
    if (search && search.trim()) {
      const searchRegex = search.trim().split(/\s+/).map(word =>
        `(?=.*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
      ).join('');
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { developerName: { $regex: search, $options: 'i' } },
        { 'attributes.values': { $regex: search, $options: 'i' } },
      ];
    }

    // Multi-attribute filtering: filters is JSON like {"attrId1":["val1","val2"],"attrId2":["val3"]}
    if (filters) {
      try {
        const parsed = typeof filters === 'string' ? JSON.parse(filters) : filters;
        const attrConditions = [];
        for (const [attrId, values] of Object.entries(parsed)) {
          if (Array.isArray(values) && values.length > 0) {
            attrConditions.push({
              attributes: {
                $elemMatch: {
                  attributeId: attrId,
                  values: { $in: values },
                },
              },
            });
          }
        }
        if (attrConditions.length > 0) {
          filter.$and = attrConditions;
        }
      } catch (e) {
        // Invalid JSON, skip filters
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    
    // Sort logic mapping
    const sort = req.query.sort || 'relevance';
    let sortQuery = { updatedAt: -1 }; // Fallback relevance
    if (sort === 'newest') sortQuery = { createdAt: -1 };
    if (sort === 'alphabetical') sortQuery = { name: 1 };
    
    const products = await Product.find(filter)
      .select('name tagline logo tags developerName attributes createdAt updatedAt')
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering')
      .sort(sortQuery)
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
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Failed to search products.' });
  }
};

// Dynamic filter facets — recalculates available values based on current filters
exports.getFilterFacets = async (req, res) => {
  try {
    const { search, filters } = req.query;

    // Get all filterable attributes
    const filterableAttrs = await Attribute.find({ showForFiltering: true })
      .select('name options _id');

    // Build base filter (same logic as searchProducts but without attribute filters)
    const baseFilter = { status: 'published' };
    if (search && search.trim()) {
      baseFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { developerName: { $regex: search, $options: 'i' } },
        { 'attributes.values': { $regex: search, $options: 'i' } },
      ];
    }

    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      } catch (e) { /* ignore */ }
    }

    // For each filterable attribute, compute available values
    // by applying all OTHER filters (not the current attribute's filter)
    const facets = [];

    for (const attr of filterableAttrs) {
      const attrFilter = { ...baseFilter };
      const attrConditions = [];

      // Apply all filters EXCEPT this attribute
      for (const [attrId, values] of Object.entries(parsedFilters)) {
        if (attrId !== attr._id.toString() && Array.isArray(values) && values.length > 0) {
          attrConditions.push({
            attributes: {
              $elemMatch: {
                attributeId: attrId,
                values: { $in: values },
              },
            },
          });
        }
      }

      if (attrConditions.length > 0) {
        attrFilter.$and = attrConditions;
      }

      // Find all products matching the cross-filter, then extract unique values for this attribute
      const products = await Product.find(attrFilter)
        .select('attributes')
        .lean();

      const availableValues = new Set();
      for (const prod of products) {
        const prodAttr = (prod.attributes || []).find(
          a => a.attributeId?.toString() === attr._id.toString()
        );
        if (prodAttr) {
          prodAttr.values.forEach(v => availableValues.add(v));
        }
      }

      facets.push({
        _id: attr._id,
        name: attr.name,
        options: attr.options.filter(opt => availableValues.has(opt)),
        selectedValues: parsedFilters[attr._id.toString()] || [],
      });
    }

    res.json({ facets });
  } catch (error) {
    console.error('Get filter facets error:', error);
    res.status(500).json({ message: 'Failed to retrieve filter facets.' });
  }
};

// Get single published product with full attribute data for public detail page
exports.getPublicProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, status: 'published' })
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering options');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Find similar products - Enhanced Rank & Filter Logic
    // Minimum Rule: Get published products (excluding current)
    const allPublished = await Product.find({ _id: { $ne: product._id }, status: 'published' })
      .populate('attributes.attributeId', 'name')
      .lean();

    // Determine current product's Category and all other generic Attributes explicitly
    let currentCategoryValues = [];
    let otherAttributesMap = {}; // mapping attrName -> values

    for (const attr of product.attributes || []) {
      const attrName = attr.attributeId?.name || '';
      if (!attrName) continue;
      if (attrName === 'Category') {
        currentCategoryValues = attr.values || [];
      } else {
        otherAttributesMap[attrName] = attr.values || [];
      }
    }
    const currentTags = product.tags || [];

    // Scoring System
    const scoredProducts = allPublished.map(p => {
      let score = 0;
      let pCategoryValues = [];
      let pOtherAttributesMap = {};

      for (const attr of p.attributes || []) {
        const attrName = attr.attributeId?.name || '';
        if (!attrName) continue;
        if (attrName === 'Category') {
          pCategoryValues = attr.values || [];
        } else {
          pOtherAttributesMap[attrName] = attr.values || [];
        }
      }

      // Hard Rule Check (Minimum Rule)
      const hasSameCategory = currentCategoryValues.length > 0 
        ? pCategoryValues.some(c => currentCategoryValues.includes(c))
        : false;

      // Score: Category Match
      if (hasSameCategory) score += 50;

      // Score: Tags Overlap Match
      const pTags = p.tags || [];
      let commonTags = 0;
      for (const t of pTags) {
         if (currentTags.includes(t)) commonTags++;
      }
      if (commonTags > 0) score += (10 * commonTags);

      // Score: Any Generic Attribute Overlap (Looping through custom attributes dynamically instead of hardcoding 'Geography')
      for (const [attrName, targetValues] of Object.entries(otherAttributesMap)) {
        if (targetValues.length > 0 && pOtherAttributesMap[attrName]) {
          const overlap = pOtherAttributesMap[attrName].some(v => targetValues.includes(v));
          // Provide incremental boosts for any matching attribute points!
          if (overlap) score += 15;
        }
      }

      // Score: Same Developer
      if (p.developerName && p.developerName === product.developerName) {
        score += 10;
      }

      return { product: p, score, hasSameCategory };
    });

    // Step-wise fallback filtering strategy:
    // 1. Same category AND tags overlap
    let filtered = scoredProducts.filter(sp => sp.hasSameCategory && sp.product.tags?.some(t => currentTags.includes(t)));
    
    // 2. Fallback: Same category only
    if (filtered.length < 3) {
      filtered = scoredProducts.filter(sp => sp.hasSameCategory);
    }
    
    // 3. Fallback: Anything matching (sorted strictly by score)
    if (filtered.length < 3) {
      filtered = scoredProducts; // All others, will be pushed down by score sorting
    }

    // Sort by Score DESC, then fallback to newest (Popularity pseudo-proxy)
    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Date fallback
      return new Date(b.product.createdAt) - new Date(a.product.createdAt);
    });

    // Map strictly 3 limits
    const similarProducts = filtered.slice(0, 3).map(sp => sp.product);

    res.json({ product, similarProducts });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ message: 'Failed to retrieve product.' });
  }
};
