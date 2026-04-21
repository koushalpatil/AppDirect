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
} = require('../controllers/configController');

// Public routes
router.get('/public/homepage', getPublicHomepage);
router.get('/public/contact-form', getPublicContactForm);

// Admin routes
router.get('/contact', auth, adminOnly, getContactConfig);
router.put('/contact', auth, adminOnly, updateContactConfig);
router.get('/homepage', auth, adminOnly, getHomepageConfig);
router.put('/homepage', auth, adminOnly, updateHomepageConfig);

module.exports = router;
