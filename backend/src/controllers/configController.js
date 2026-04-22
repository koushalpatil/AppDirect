const ContentConfig = require('../models/ContentConfig');
const Product = require('../models/Product');
const ContactSubmission = require('../models/ContactSubmission');

const DEFAULT_CONTACT_FIELDS = [
  {
    fieldName: 'firstName',
    label: 'First Name',
    type: 'text',
    required: true,
    placeholder: 'Enter first name',
    helpText: '',
    defaultValue: '',
    validations: { minLength: 2, maxLength: 50 },
    options: [],
    isDefault: true,
    order: 0,
  },
  {
    fieldName: 'lastName',
    label: 'Last Name',
    type: 'text',
    required: true,
    placeholder: 'Enter last name',
    helpText: '',
    defaultValue: '',
    validations: { minLength: 1, maxLength: 50 },
    options: [],
    isDefault: true,
    order: 1,
  },
  {
    fieldName: 'workEmail',
    label: 'Work Email',
    type: 'email',
    required: true,
    placeholder: 'name@company.com',
    helpText: '',
    defaultValue: '',
    validations: {},
    options: [],
    isDefault: true,
    order: 2,
  },
  {
    fieldName: 'companySize',
    label: 'Company Size',
    type: 'select',
    required: true,
    placeholder: 'Select company size',
    helpText: '',
    defaultValue: '',
    validations: {},
    options: [
      { label: '1-10', value: '1-10' },
      { label: '11-50', value: '11-50' },
      { label: '51-200', value: '51-200' },
      { label: '201-500', value: '201-500' },
      { label: '500+', value: '500+' },
    ],
    isDefault: true,
    order: 3,
  },
  {
    fieldName: 'message',
    label: 'Message',
    type: 'textarea',
    required: true,
    placeholder: 'Tell us what you need',
    helpText: '',
    defaultValue: '',
    validations: { minLength: 10, maxLength: 1000 },
    options: [],
    isDefault: true,
    order: 4,
  },
];

const SUPPORTED_TYPES = new Set(['text', 'textarea', 'email', 'url', 'number', 'select', 'radio', 'checkbox', 'date', 'file', 'tel']);

const toNumberOrUndefined = (val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
};

const sanitizeFieldName = (labelOrName = '') => String(labelOrName)
  .trim()
  .replace(/[^a-zA-Z0-9_\s]/g, '')
  .replace(/\s+/g, '_')
  .replace(/^\d+/, '')
  .replace(/^_+/, '')
  .replace(/_+/g, '_')
  .toLowerCase();

const normalizeOptions = (options = []) => {
  if (!Array.isArray(options)) return [];
  return options
    .map((opt) => {
      if (typeof opt === 'string') {
        const clean = opt.trim();
        if (!clean) return null;
        return { label: clean, value: clean };
      }
      if (opt && typeof opt === 'object') {
        const label = String(opt.label || opt.value || '').trim();
        const value = String(opt.value || opt.label || '').trim();
        if (!label || !value) return null;
        return { label, value };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeFieldConfig = (field, index) => {
  const label = String(field?.label || '').trim();
  const fieldName = sanitizeFieldName(field?.fieldName || label);
  const type = SUPPORTED_TYPES.has(field?.type) ? field.type : 'text';
  const validations = field?.validations || {};

  return {
    fieldName,
    label,
    type,
    required: !!field?.required,
    placeholder: String(field?.placeholder || '').trim(),
    helpText: String(field?.helpText || '').trim(),
    defaultValue: field?.defaultValue ?? (type === 'checkbox' ? [] : ''),
    options: normalizeOptions(field?.options),
    validations: {
      minLength: toNumberOrUndefined(validations.minLength),
      maxLength: toNumberOrUndefined(validations.maxLength),
      regex: validations.regex ? String(validations.regex).trim() : undefined,
      min: toNumberOrUndefined(validations.min),
      max: toNumberOrUndefined(validations.max),
      step: toNumberOrUndefined(validations.step),
      minDate: validations.minDate ? String(validations.minDate).trim() : undefined,
      maxDate: validations.maxDate ? String(validations.maxDate).trim() : undefined,
      customError: validations.customError ? String(validations.customError).trim() : undefined,
    },
    isDefault: !!field?.isDefault,
    order: Number.isFinite(Number(field?.order)) ? Number(field.order) : index,
  };
};

const validateFieldConfigs = (fields) => {
  const normalized = fields.map((field, index) => normalizeFieldConfig(field, index));
  const errors = [];
  const usedKeys = new Set();

  normalized.forEach((field, index) => {
    if (!field.label) errors.push(`Field #${index + 1}: label is required.`);
    if (!field.fieldName) errors.push(`Field #${index + 1}: fieldName is required and must contain letters.`);
    if (usedKeys.has(field.fieldName)) errors.push(`Field #${index + 1}: fieldName "${field.fieldName}" must be unique.`);
    usedKeys.add(field.fieldName);

    if (!SUPPORTED_TYPES.has(field.type)) {
      errors.push(`Field #${index + 1}: unsupported type "${field.type}".`);
    }

    if (['select', 'radio'].includes(field.type) && field.options.length === 0) {
      errors.push(`Field #${index + 1}: ${field.type} must have at least one option.`);
    }

    const optionValues = field.options.map((o) => o.value);
    if (new Set(optionValues).size !== optionValues.length) {
      errors.push(`Field #${index + 1}: option values must be unique.`);
    }

    const v = field.validations || {};
    if (v.minLength !== undefined && v.maxLength !== undefined && v.minLength > v.maxLength) {
      errors.push(`Field #${index + 1}: minLength cannot be greater than maxLength.`);
    }
    if (v.min !== undefined && v.max !== undefined && v.min > v.max) {
      errors.push(`Field #${index + 1}: min cannot be greater than max.`);
    }
    if (v.regex) {
      try {
        // eslint-disable-next-line no-new
        new RegExp(v.regex);
      } catch {
        errors.push(`Field #${index + 1}: invalid regex pattern.`);
      }
    }
    if (v.minDate && Number.isNaN(new Date(v.minDate).getTime())) {
      errors.push(`Field #${index + 1}: invalid minDate.`);
    }
    if (v.maxDate && Number.isNaN(new Date(v.maxDate).getTime())) {
      errors.push(`Field #${index + 1}: invalid maxDate.`);
    }
  });

  return {
    normalized: normalized.sort((a, b) => a.order - b.order).map((f, idx) => ({ ...f, order: idx })),
    errors,
  };
};

const isBlank = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

const validateSubmissionValue = (field, rawValue) => {
  const fieldLabel = field.label || field.fieldName;
  const v = field.validations || {};
  const optionValues = new Set((field.options || []).map((o) => o.value));

  if (field.required && isBlank(rawValue)) {
    return { error: v.customError || `${fieldLabel} is required.` };
  }

  if (!field.required && isBlank(rawValue)) {
    return { value: field.type === 'checkbox' ? [] : '' };
  }

  if (field.type === 'checkbox') {
    if (field.options && field.options.length > 0) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      const cleanValues = values.map((x) => String(x));
      const invalid = cleanValues.find((x) => !optionValues.has(x));
      if (invalid) return { error: v.customError || `${fieldLabel} has invalid option selected.` };
      return { value: cleanValues };
    }
    return { value: !!rawValue };
  }

  if (field.type === 'number') {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) return { error: v.customError || `${fieldLabel} must be a number.` };
    if (v.min !== undefined && num < v.min) return { error: v.customError || `${fieldLabel} must be >= ${v.min}.` };
    if (v.max !== undefined && num > v.max) return { error: v.customError || `${fieldLabel} must be <= ${v.max}.` };
    if (v.step !== undefined && v.step > 0 && v.min !== undefined) {
      const ratio = (num - v.min) / v.step;
      if (Math.abs(ratio - Math.round(ratio)) > 1e-8) {
        return { error: v.customError || `${fieldLabel} must follow step ${v.step}.` };
      }
    }
    return { value: num };
  }

  if (field.type === 'select' || field.type === 'radio') {
    const selected = String(rawValue);
    if (!optionValues.has(selected)) return { error: v.customError || `${fieldLabel} has an invalid selection.` };
    return { value: selected };
  }

  if (field.type === 'date') {
    const dateValue = new Date(String(rawValue));
    if (Number.isNaN(dateValue.getTime())) return { error: v.customError || `${fieldLabel} must be a valid date.` };
    if (v.minDate && dateValue < new Date(v.minDate)) return { error: v.customError || `${fieldLabel} must be on/after ${v.minDate}.` };
    if (v.maxDate && dateValue > new Date(v.maxDate)) return { error: v.customError || `${fieldLabel} must be on/before ${v.maxDate}.` };
    return { value: String(rawValue) };
  }

  if (field.type === 'file') {
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return { error: `${fieldLabel} must be a valid uploaded file.` };
    }
    return { value: rawValue.trim() };
  }

  const textVal = String(rawValue).trim();

  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(textVal)) return { error: v.customError || `${fieldLabel} must be a valid email address.` };
  }

  if (field.type === 'url') {
    try {
      // eslint-disable-next-line no-new
      new URL(textVal);
    } catch {
      return { error: v.customError || `${fieldLabel} must be a valid URL.` };
    }
  }

  if (v.minLength !== undefined && textVal.length < v.minLength) {
    return { error: v.customError || `${fieldLabel} must be at least ${v.minLength} characters.` };
  }
  if (v.maxLength !== undefined && textVal.length > v.maxLength) {
    return { error: v.customError || `${fieldLabel} must be at most ${v.maxLength} characters.` };
  }
  if (v.regex) {
    try {
      const re = new RegExp(v.regex);
      if (!re.test(textVal)) return { error: v.customError || `${fieldLabel} format is invalid.` };
    } catch {
      return { error: `${fieldLabel} has invalid validation config.` };
    }
  }

  return { value: textVal };
};

const getOrCreateContactConfig = async () => {
  let config = await ContentConfig.findOne({ type: 'contact_form' });
  if (!config) {
    config = await ContentConfig.create({
      type: 'contact_form',
      contactFields: DEFAULT_CONTACT_FIELDS,
    });
  }
  return config;
};

// Get or initialize contact form config
exports.getContactConfig = async (req, res) => {
  try {
    const config = await getOrCreateContactConfig();
    const normalized = validateFieldConfigs(config.contactFields || []).normalized;
    res.json({ config: { ...config.toObject(), contactFields: normalized } });
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

    const { normalized, errors } = validateFieldConfigs(contactFields);
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Invalid field configuration.',
        errors,
      });
    }

    let config = await ContentConfig.findOne({ type: 'contact_form' });
    if (!config) {
      config = new ContentConfig({ type: 'contact_form' });
    }

    config.contactFields = normalized;
    config.updatedBy = req.user._id;
    await config.save();

    res.json({
      message: 'Contact form configuration updated.',
      config: { ...config.toObject(), contactFields: normalized },
    });
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
        select: 'name tagline logo tags developerName',
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
    const config = await getOrCreateContactConfig();
    const fields = validateFieldConfigs(config.contactFields || []).normalized
      .filter((field) => field.type !== 'file');
    res.json({ fields });
  } catch (error) {
    console.error('Get public contact form error:', error);
    res.status(500).json({ message: 'Failed to retrieve contact form.' });
  }
};

// Public: Submit contact form based on dynamic config
exports.submitPublicContactForm = async (req, res) => {
  try {
    const { productId, values } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required.' });
    }
    if (!values || typeof values !== 'object') {
      return res.status(400).json({ message: 'values object is required.' });
    }

    const product = await Product.findById(productId).select('_id status');
    if (!product || product.status !== 'published') {
      return res.status(400).json({ message: 'Invalid product.' });
    }

    const config = await getOrCreateContactConfig();
    const fields = validateFieldConfigs(config.contactFields || []).normalized
      .filter((field) => field.type !== 'file');

    const cleanData = {};
    const fieldErrors = {};

    fields.forEach((field) => {
      const result = validateSubmissionValue(field, values[field.fieldName]);
      if (result.error) {
        fieldErrors[field.fieldName] = result.error;
      } else {
        cleanData[field.fieldName] = result.value;
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: fieldErrors,
      });
    }

    const submission = await ContactSubmission.create({
      productId,
      data: cleanData,
    });

    return res.status(201).json({
      message: 'Contact form submitted successfully.',
      submissionId: submission._id,
    });
  } catch (error) {
    console.error('Submit public contact form error:', error);
    return res.status(500).json({ message: 'Failed to submit contact form.' });
  }
};
