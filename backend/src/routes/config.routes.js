const router = require('express').Router();
const auth = require('../middlewares/auth');
const adminOnly = require('../middlewares/rbac');
const {
  getContactConfig,
  updateContactConfig,
  getHomepageConfig,
  updateHomepageConfig,
  getPublicHomepage,
  getPublicContactForm,
  submitPublicContactForm,
  getSimilarityConfig,
  updateSimilarityConfig,
} = require('../controllers/configController');

// Public routes
router.get('/public/homepage', getPublicHomepage);
router.get('/public/contact-form', getPublicContactForm);
router.post('/public/contact-form/submit', submitPublicContactForm);

// Admin routes
router.get('/contact', auth, adminOnly, getContactConfig);
router.put('/contact', auth, adminOnly, updateContactConfig);
router.get('/homepage', auth, adminOnly, getHomepageConfig);
router.put('/homepage', auth, adminOnly, updateHomepageConfig);
router.get('/similarity', auth, adminOnly, getSimilarityConfig);
router.put('/similarity', auth, adminOnly, updateSimilarityConfig);

module.exports = router;
