import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit3, Trash2, Package } from 'lucide-react';
import './Admin.css';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadProducts(); }, [statusFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await productAPI.getAll(params);
      setProducts(res.data.products || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await productAPI.delete(id);
      toast.success('Product deleted');
      loadProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your marketplace products</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          <Plus size={16} /> New Product
        </Link>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary"><Search size={16} /></button>
      </form>

      <div className="filter-row">
        {['', 'published', 'draft'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Package size={64} />
          <h3>No products yet</h3>
          <p>Create your first product to get started</p>
          <Link to="/admin/products/new" className="btn btn-primary mt-lg">
            <Plus size={16} /> Create Product
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product._id} className="card product-card" onClick={() => navigate(`/admin/products/${product._id}/edit`)}>
              <div className="product-card-body">
                <div className="product-card-header">
                  {product.logo ? (
                    <img src={product.logo} alt={product.name} className="product-logo" />
                  ) : (
                    <div className="product-logo-placeholder">{product.name[0]}</div>
                  )}
                  <div>
                    <div className="product-card-title">{product.name}</div>
                    {product.tagline && <div className="product-card-tagline">{product.tagline}</div>}
                  </div>
                </div>

                <div className="product-card-meta">
                  <span className={`badge ${product.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                    {product.status}
                  </span>
                  <div className="product-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/admin/products/${product._id}/edit`)} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(product._id, product.name)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
