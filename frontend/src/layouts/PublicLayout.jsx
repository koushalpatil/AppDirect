import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { catalogAPI } from '../services/api';
import { productAPI } from '../services/api';
import { LogOut, User, ChevronDown, Menu, X } from 'lucide-react';
import './PublicLayout.css';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const megaMenuRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await catalogAPI.getPublic();
      const catAttr = res.data.attributes.find(a => a.name === 'Category');
      if (catAttr) {
        setCategories(catAttr.options || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleCategoryHover = async (category) => {
    setHoveredCategory(category);
    try {
      const catAttr = (await catalogAPI.getPublic()).data.attributes.find(a => a.name === 'Category');
      if (catAttr) {
        const res = await productAPI.getByAttribute({ attributeId: catAttr._id, value: category });
        setCategoryProducts(res.data.products || []);
      }
    } catch {
      setCategoryProducts([]);
    }
  };

  const handleMegaEnter = () => {
    clearTimeout(timeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleMegaLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
      setHoveredCategory(null);
      setCategoryProducts([]);
    }, 200);
  };

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="header-container">
          <Link to="/" className="header-brand">
            <div className="brand-icon">A</div>
            <span className="brand-name">AppDirect</span>
          </Link>

          <nav className="header-nav">
            <div
              className="nav-dropdown-trigger"
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <span className="nav-link-main">
                All Products <ChevronDown size={14} />
              </span>

              {megaMenuOpen && (
                <div className="mega-menu" ref={megaMenuRef}>
                  <div className="mega-menu-categories">
                    <h4>Categories</h4>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className={`mega-category ${hoveredCategory === cat ? 'active' : ''}`}
                        onMouseEnter={() => handleCategoryHover(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-muted" style={{fontSize:'13px', padding:'8px'}}>No categories yet</p>
                    )}
                  </div>
                  <div className="mega-menu-products">
                    {hoveredCategory ? (
                      <>
                        <h4>{hoveredCategory}</h4>
                        {categoryProducts.length > 0 ? (
                          <div className="mega-products-grid">
                            {categoryProducts.map(p => (
                              <Link
                                key={p._id}
                                to={`/products/${p._id}`}
                                className="mega-product-item"
                                onClick={() => setMegaMenuOpen(false)}
                              >
                                {p.logo && <img src={p.logo} alt={p.name} className="mega-product-logo" />}
                                <div>
                                  <span className="mega-product-name">{p.name}</span>
                                  {p.tagline && <span className="mega-product-tagline">{p.tagline}</span>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted" style={{fontSize:'13px'}}>No products in this category</p>
                        )}
                      </>
                    ) : (
                      <div className="mega-placeholder">
                        <p>Hover over a category to see products</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="header-actions">
            {user ? (
              <div className="header-user">
                <span className="header-username">{user.firstName}</span>
                {user.role === 'admin' && (
                  <Link to="/admin" className="btn btn-sm btn-secondary">Admin Panel</Link>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="header-auth">
                <Link to="/login" className="btn btn-sm btn-ghost">Log In</Link>
                <Link to="/signup" className="btn btn-sm btn-primary">Sign Up</Link>
              </div>
            )}

            <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="brand-icon small">A</div>
            <span>AppDirect</span>
          </div>
          <p className="footer-copy">&copy; {new Date().getFullYear()} AppDirect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
