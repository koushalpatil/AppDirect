const router = require('express').Router();
const auth = require('../middlewares/auth');
const adminOnly = require('../middlewares/rbac');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductLogs,
  getPublishedProducts,
  getProductsByAttribute,
} = require('../controllers/productController');

// Public routes
router.get('/public', getPublishedProducts);
router.get('/public/by-attribute', getProductsByAttribute);
router.get('/public/:id', getProduct);

// Admin routes
router.post('/', auth, adminOnly, createProduct);
router.get('/', auth, adminOnly, getProducts);
router.get('/:id', auth, adminOnly, getProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);
router.get('/:id/logs', auth, adminOnly, getProductLogs);

module.exports = router;
