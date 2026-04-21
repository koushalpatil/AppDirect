import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { configAPI } from '../../services/api';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import './Public.css';

export default function HomePage() {
  const [homepage, setHomepage] = useState({ heroImage: '', slidingImages: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);

  useEffect(() => { loadHomepage(); }, []);

  useEffect(() => {
    if (homepage.slidingImages.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % homepage.slidingImages.length);
      }, 4000);
      return () => clearInterval(slideInterval.current);
    }
  }, [homepage.slidingImages]);

  const loadHomepage = async () => {
    try {
      const res = await configAPI.getPublicHomepage();
      setHomepage(res.data);
    } catch (err) {
      console.error('Failed to load homepage', err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % homepage.slidingImages.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + homepage.slidingImages.length) % homepage.slidingImages.length);

  if (loading) return <div className="page-loader" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  return (
    <div className="homepage fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        {homepage.heroImage ? (
          <div className="hero-image-wrapper">
            <img src={homepage.heroImage} alt="Marketplace" className="hero-image" />
            <div className="hero-overlay">
              <div className="hero-content">
                <h1 className="hero-title">Discover the Best Business Applications</h1>
                <p className="hero-subtitle">Find, compare, and integrate the top cloud solutions for your business</p>
                <Link to="#categories" className="btn btn-primary btn-lg">
                  Explore Products <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-placeholder">
            <div className="hero-content">
              <h1 className="hero-title">Discover the Best Business Applications</h1>
              <p className="hero-subtitle">Find, compare, and integrate the top cloud solutions for your business</p>
            </div>
          </div>
        )}
      </section>

      {/* Sliding Images */}
      {homepage.slidingImages.length > 0 && (
        <section className="slider-section">
          <div className="slider-container">
            <div className="slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {homepage.slidingImages.map((img, idx) => (
                <div key={idx} className="slider-slide">
                  <img src={img} alt={`Slide ${idx + 1}`} />
                </div>
              ))}
            </div>
            {homepage.slidingImages.length > 1 && (
              <>
                <button className="slider-btn slider-prev" onClick={prevSlide}><ChevronLeft size={20} /></button>
                <button className="slider-btn slider-next" onClick={nextSlide}><ChevronRight size={20} /></button>
                <div className="slider-dots">
                  {homepage.slidingImages.map((_, idx) => (
                    <button key={idx} className={`slider-dot ${idx === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(idx)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Categories & Products */}
      <section className="categories-section" id="categories">
        <div className="section-container">
          {homepage.categories.length > 0 ? (
            homepage.categories.map((cat, idx) => (
              <div key={idx} className="category-block">
                <div className="category-header">
                  <h2 className="category-title">{cat.title || cat.categoryValue || cat.categoryName}</h2>
                  <div className="category-divider" />
                </div>
                {cat.products && cat.products.length > 0 ? (
                  <div className="products-row">
                    {cat.products.map(product => (
                      <Link key={product._id} to={`/products/${product._id}`} className="product-tile">
                        <div className="product-tile-logo">
                          {product.logo ? (
                            <img src={product.logo} alt={product.name} />
                          ) : (
                            <div className="product-tile-logo-placeholder">{product.name?.[0]}</div>
                          )}
                        </div>
                        <div className="product-tile-info">
                          <h3 className="product-tile-name">{product.name}</h3>
                          {product.tagline && <p className="product-tile-tagline">{product.tagline}</p>}
                        </div>
                        {product.tags && product.tags.length > 0 && (
                          <div className="product-tile-tags">
                            {product.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted" style={{ padding: '20px 0', fontSize: 14 }}>No products in this category yet</p>
                )}
              </div>
            ))
          ) : (
            <div className="empty-hero">
              <h2>Welcome to AppDirect</h2>
              <p>Browse our marketplace for the best business solutions</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
