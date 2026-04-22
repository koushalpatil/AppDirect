import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { catalogAPI, productAPI } from '../services/api';
import { ChevronDown, Search, LogOut, Menu, X } from 'lucide-react';
import dblogo from '../assets/dblogo.png';
import './PublicLayout.css';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryAttrId, setCategoryAttrId] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const res = await catalogAPI.getPublic();
      const attrs = res.data.attributes || [];
      // Use first attribute that has showForFiltering or fallback to 'Category'
      const catAttr = attrs.find(a => a.name === 'Category') || attrs[0];
      if (catAttr) {
        setCategories(catAttr.options || []);
        setCategoryAttrId(catAttr._id);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleCategoryHover = async (category) => {
    setHoveredCategory(category);
    if (!categoryAttrId) return;
    try {
      const res = await productAPI.getByAttribute({ attributeId: categoryAttrId, value: category });
      setCategoryProducts(res.data.products || []);
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

  const getCategoryFilterUrl = (category) => {
    if (!categoryAttrId || !category) return '/products';
    const params = new URLSearchParams();
    params.set(categoryAttrId, category);
    return `/products?${params.toString()}`;
  };

  const getCategoryProductFilterUrl = (category, productId) => {
    if (!categoryAttrId || !category) return '/products';
    const params = new URLSearchParams();
    params.set(categoryAttrId, category);
    if (productId) params.set('productIds', productId);
    return `/products?${params.toString()}`;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length > 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await productAPI.search({ search: val, limit: 5 });
          setSuggestions(res.data.products || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error(err);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    } else {
      navigate('/products');
    }
  };

  return (
    <div className="pub-layout">
      {/* Top Blue Header */}
      <header className="pub-top-bar">
        <div className="pub-top-container">
          <Link to="/" className="pub-brand">
            <img src={dblogo} alt="Darwinbox" className="pub-header-logo" />
          </Link>
          <div className="pub-top-actions">
            {user ? (
              <div className="pub-user-area">
                <span className="pub-username">{user.firstName}</span>
                {user.role === 'admin' && (
                  <Link to="/admin" className="pub-top-link">Admin Panel</Link>
                )}
                <button className="pub-top-btn" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="pub-auth-area">
                <Link to="/login" className="pub-top-link">Log In</Link>
                <Link to="/signup" className="pub-top-link pub-signup-btn">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Nav with All Products + Search */}
      <nav className="pub-nav-bar">
        <div className="pub-nav-container">
          <div className="pub-nav-left">
            <div
              className="pub-nav-dropdown"
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <Link to="/products" className="pub-nav-trigger">
                All Products <ChevronDown size={14} />
              </Link>

              {megaMenuOpen && (
                <div className="pub-mega-menu">
                  <div className="pub-mega-cats">
                    <Link to="/products" className="pub-mega-view-all" onClick={() => setMegaMenuOpen(false)}>
                      View All
                    </Link>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className={`pub-mega-cat ${hoveredCategory === cat ? 'active' : ''}`}
                        onMouseEnter={() => handleCategoryHover(cat)}
                        onClick={() => {
                          navigate(getCategoryFilterUrl(cat));
                          setMegaMenuOpen(false);
                        }}
                      >
                        {cat} <span className="cat-arrow">&rsaquo;</span>
                      </button>
                    ))}
                    {categories.length === 0 && (
                      <p className="pub-mega-empty">No categories yet</p>
                    )}
                  </div>
                  <div className="pub-mega-products">
                    {hoveredCategory ? (
                      <>
                        {categoryAttrId && (
                           <Link 
                            to={getCategoryFilterUrl(hoveredCategory)} 
                              className="pub-mega-view-all-right" 
                              onClick={() => setMegaMenuOpen(false)}
                           >
                             View All
                           </Link>
                        )}
                        {categoryProducts.length > 0 ? (
                          <div className="pub-mega-grid">
                            {categoryProducts.map(p => (
                              <Link
                                key={p._id}
                                to={getCategoryProductFilterUrl(hoveredCategory, p._id)}
                                className="pub-mega-item"
                                onClick={() => setMegaMenuOpen(false)}
                              >
                                {p.logo && <img src={p.logo} alt={p.name} className="pub-mega-logo" />}
                                <div>
                                  <span className="pub-mega-name">{p.name}</span>
                                  {p.tagline && <span className="pub-mega-tagline">{p.tagline}</span>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="pub-mega-empty">No products in this category</p>
                        )}
                      </>
                    ) : (
                      <div className="pub-mega-placeholder">
                        <p>Hover over a category to see products</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pub-search-wrapper" ref={dropdownRef}>
            <form className="pub-search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="pub-search-input"
                placeholder="Search Products"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
              />
              <button type="submit" className="pub-search-btn">
                <Search size={16} />
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="pub-search-suggestions">
                {suggestions.map(p => (
                  <Link
                    key={p._id}
                    to={`/products/${p._id}`}
                    className="pub-suggestion-item"
                    onClick={() => setShowSuggestions(false)}
                  >
                    {p.logo ? (
                      <img src={p.logo} alt={p.name} className="pub-suggestion-logo" />
                    ) : (
                      <div className="pub-suggestion-logo-placeholder">{p.name?.[0]}</div>
                    )}
                    <div className="pub-suggestion-details">
                      <div className="pub-suggestion-name">{p.name}</div>
                      {p.tagline && <div className="pub-suggestion-tagline">{p.tagline}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pub-main">
        <Outlet />
      </main>

      <footer className="pub-footer">
        <div className="pub-footer-container">
          <div className="pub-footer-brand">
            <img src={dblogo} alt="Darwinbox" className="pub-footer-logo" />
          </div>
          <p className="pub-footer-copy">  Copyright &copy;{new Date().getFullYear()}.Darwinbox Digital Solutions Pvt. Ltd. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
