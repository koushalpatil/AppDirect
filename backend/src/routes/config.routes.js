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
  getFooterConfig,
  updateFooterConfig,
  getPublicFooter,
} = require('../controllers/configController');

// Public routes
router.get('/public/homepage', getPublicHomepage);
router.get('/public/contact-form', getPublicContactForm);
router.post('/public/contact-form/submit', submitPublicContactForm);
router.get('/public/footer', getPublicFooter);

// Admin routes
router.get('/contact', auth, adminOnly, getContactConfig);
router.put('/contact', auth, adminOnly, updateContactConfig);
router.get('/homepage', auth, adminOnly, getHomepageConfig);
router.put('/homepage', auth, adminOnly, updateHomepageConfig);
router.get('/similarity', auth, adminOnly, getSimilarityConfig);
router.put('/similarity', auth, adminOnly, updateSimilarityConfig);
router.get('/footer', auth, adminOnly, getFooterConfig);
router.put('/footer', auth, adminOnly, updateFooterConfig);

module.exports = router;
