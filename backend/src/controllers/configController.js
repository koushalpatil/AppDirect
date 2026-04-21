const ContentConfig = require('../models/ContentConfig');

const DEFAULT_CONTACT_FIELDS = [
  { fieldName: 'firstName', label: 'First Name', type: 'text', required: true, isDefault: true, order: 0 },
  { fieldName: 'lastName', label: 'Last Name', type: 'text', required: true, isDefault: true, order: 1 },
  { fieldName: 'email', label: 'Email', type: 'email', required: true, isDefault: true, order: 2 },
  { fieldName: 'phone', label: 'Phone', type: 'tel', required: false, isDefault: true, order: 3 },
  { fieldName: 'companyName', label: 'Company Name', type: 'text', required: false, isDefault: true, order: 4 },
  { fieldName: 'companySize', label: 'Company Size', type: 'select', required: false, isDefault: true, order: 5, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
  { fieldName: 'street', label: 'Street', type: 'text', required: false, isDefault: true, order: 6 },
  { fieldName: 'suite', label: 'Suite', type: 'text', required: false, isDefault: true, order: 7 },
  { fieldName: 'city', label: 'City', type: 'text', required: false, isDefault: true, order: 8 },
  { fieldName: 'state', label: 'State', type: 'text', required: false, isDefault: true, order: 9 },
  { fieldName: 'zipCode', label: 'Zip Code', type: 'text', required: false, isDefault: true, order: 10 },
  { fieldName: 'country', label: 'Country', type: 'text', required: false, isDefault: true, order: 11 },
  { fieldName: 'notes', label: 'Notes', type: 'textarea', required: false, isDefault: true, order: 12 },
];

// Get or initialize contact form config
exports.getContactConfig = async (req, res) => {
  try {
    let config = await ContentConfig.findOne({ type: 'contact_form' });

    if (!config) {
      config = await ContentConfig.create({
        type: 'contact_form',
        contactFields: DEFAULT_CONTACT_FIELDS,
      });
    }

    res.json({ config });
  } catch (error) {
    console.error('Get contact config error:', error);
    res.status(500).json({ message: 'Failed to retrieve contact form configuration.' });
  }
};

// Update contact form config
exports.updateContactConfig = async (req, res) => {
  try {
    const { contactFields } = req.body;

    if (!contactFields || !Array.isArray(contactFields)) {
      return res.status(400).json({ message: 'contactFields array is required.' });
    }

    let config = await ContentConfig.findOne({ type: 'contact_form' });
    if (!config) {
      config = new ContentConfig({ type: 'contact_form' });
    }

    config.contactFields = contactFields;
    config.updatedBy = req.user._id;
    await config.save();

    res.json({ message: 'Contact form configuration updated.', config });
  } catch (error) {
    console.error('Update contact config error:', error);
    res.status(500).json({ message: 'Failed to update contact form configuration.' });
  }
};

// Get or initialize homepage config
exports.getHomepageConfig = async (req, res) => {
  try {
    let config = await ContentConfig.findOne({ type: 'homepage' })
      .populate('homepageCategories.products', 'name tagline logo tags status');

    if (!config) {
      config = await ContentConfig.create({
        type: 'homepage',
        heroImage: '',
        slidingImages: [],
        homepageCategories: [],
      });
    }

    res.json({ config });
  } catch (error) {
    console.error('Get homepage config error:', error);
    res.status(500).json({ message: 'Failed to retrieve homepage configuration.' });
  }
};

// Update homepage config
exports.updateHomepageConfig = async (req, res) => {
  try {
    const { heroImage, slidingImages, homepageCategories } = req.body;

    let config = await ContentConfig.findOne({ type: 'homepage' });
    if (!config) {
      config = new ContentConfig({ type: 'homepage' });
    }

    if (heroImage !== undefined) config.heroImage = heroImage;
    if (slidingImages !== undefined) config.slidingImages = slidingImages;
    if (homepageCategories !== undefined) config.homepageCategories = homepageCategories;
    config.updatedBy = req.user._id;
    await config.save();

    // Re-fetch with populated products
    config = await ContentConfig.findOne({ type: 'homepage' })
      .populate('homepageCategories.products', 'name tagline logo tags status');

    res.json({ message: 'Homepage configuration updated.', config });
  } catch (error) {
    console.error('Update homepage config error:', error);
    res.status(500).json({ message: 'Failed to update homepage configuration.' });
  }
};

// Public: Get homepage data for user-facing site
exports.getPublicHomepage = async (req, res) => {
  try {
    const config = await ContentConfig.findOne({ type: 'homepage' })
      .populate({
        path: 'homepageCategories.products',
        match: { status: 'published' },
        select: 'name tagline logo tags',
      });

    res.json({
      heroImage: config?.heroImage || '',
      slidingImages: config?.slidingImages || [],
      categories: config?.homepageCategories || [],
    });
  } catch (error) {
    console.error('Get public homepage error:', error);
    res.status(500).json({ message: 'Failed to retrieve homepage data.' });
  }
};

// Public: Get contact form fields
exports.getPublicContactForm = async (req, res) => {
  try {
    let config = await ContentConfig.findOne({ type: 'contact_form' });
    if (!config) {
      config = await ContentConfig.create({
        type: 'contact_form',
        contactFields: DEFAULT_CONTACT_FIELDS,
      });
    }

    res.json({ fields: config.contactFields });
  } catch (error) {
    console.error('Get public contact form error:', error);
    res.status(500).json({ message: 'Failed to retrieve contact form.' });
  }
};
