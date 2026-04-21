import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productAPI, configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Star, Shield, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import './Public.css';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contactFields, setContactFields] = useState([]);
  const [contactForm, setContactForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadProduct(); }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getPublicOne(id);
      setProduct(res.data.product);
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const openContactForm = async () => {
    try {
      const res = await configAPI.getPublicContactForm();
      setContactFields(res.data.fields || []);
      setContactForm({});
      setShowContact(true);
    } catch {
      toast.error('Failed to load contact form');
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Validate required fields
    for (const field of contactFields) {
      if (field.required && !contactForm[field.fieldName]?.trim()) {
        return toast.error(`${field.label} is required`);
      }
    }
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      toast.success('Your inquiry has been submitted!');
      setShowContact(false);
      setSubmitting(false);
    }, 1000);
  };

  if (loading) return <div className="page-loader" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
  if (!product) return <div className="section-container" style={{ padding: '100px 0', textAlign: 'center' }}><h2>Product not found</h2></div>;

  return (
    <div className="product-detail-page fade-in">
      <div className="section-container">
        {/* Header */}
        <div className="pd-header">
          <div className="pd-header-left">
            {product.logo ? (
              <img src={product.logo} alt={product.name} className="pd-logo" />
            ) : (
              <div className="pd-logo-placeholder">{product.name[0]}</div>
            )}
            <div>
              <h1 className="pd-title">{product.name}</h1>
              {product.developerName && <p className="pd-developer">by {product.developerName}</p>}
              {product.tagline && <p className="pd-tagline">{product.tagline}</p>}
              {product.tags?.length > 0 && (
                <div className="pd-tags">
                  {product.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
              )}
            </div>
          </div>
          <div className="pd-header-right">
            <button className="btn btn-primary btn-lg" onClick={openContactForm}>
              Contact Us
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="pd-tabs">
          <button className={`pd-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`pd-tab ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>Features</button>
          <button className={`pd-tab ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Support & Policies</button>
        </div>

        {/* Tab Content */}
        <div className="pd-content">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="pd-section fade-in">
              {product.overview?.length > 0 ? (
                product.overview.map((item, idx) => (
                  <div key={idx} className="pd-block">
                    {item.title && <h3 className="pd-block-title">{item.title}</h3>}
                    {item.description && <p className="pd-block-desc">{item.description}</p>}
                    {item.screenshots?.length > 0 && (
                      <div className="pd-screenshots">
                        {item.screenshots.map((ss, ssIdx) => (
                          <img
                            key={ssIdx}
                            src={ss}
                            alt=""
                            className="pd-screenshot"
                            onClick={() => setActiveScreenshot(ss)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted">No overview information available.</p>
              )}
            </div>
          )}

          {/* Features */}
          {activeTab === 'features' && (
            <div className="pd-section fade-in">
              {product.features?.length > 0 ? (
                <div className="pd-features-grid">
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="pd-feature-card glass-card">
                      <div className="pd-feature-icon">
                        <Star size={20} />
                      </div>
                      <h4 className="pd-feature-title">{feat.title}</h4>
                      <p className="pd-feature-desc">{feat.description}</p>
                      {feat.screenshots?.length > 0 && (
                        <div className="pd-screenshots" style={{ marginTop: 12 }}>
                          {feat.screenshots.map((ss, ssIdx) => (
                            <img key={ssIdx} src={ss} alt="" className="pd-screenshot" onClick={() => setActiveScreenshot(ss)} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No features listed yet.</p>
              )}
            </div>
          )}

          {/* Support & Policies */}
          {activeTab === 'support' && (
            <div className="pd-section fade-in">
              <div className="grid-2">
                <div className="glass-card">
                  <div className="flex items-center gap-sm mb-md">
                    <Shield size={20} className="text-primary" />
                    <h3 style={{ fontWeight: 700 }}>Support</h3>
                  </div>
                  <p className="text-secondary" style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {product.supportDescription || 'No support information available.'}
                  </p>
                </div>
                <div className="glass-card">
                  <div className="flex items-center gap-sm mb-md">
                    <FileText size={20} className="text-primary" />
                    <h3 style={{ fontWeight: 700 }}>Policies</h3>
                  </div>
                  <p className="text-secondary" style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {product.policies || 'No policies available.'}
                  </p>
                </div>
              </div>

              {/* Attributes */}
              {product.attributes?.length > 0 && (
                <div className="mt-xl">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Product Attributes</h3>
                  <div className="grid-3">
                    {product.attributes.map((attr, idx) => (
                      <div key={idx} className="glass-card">
                        <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {attr.attributeId?.name || attr.attributeName}
                        </h4>
                        <div className="flex gap-sm flex-wrap">
                          {attr.values.map(v => <span key={v} className="badge badge-primary">{v}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Lightbox */}
      {activeScreenshot && (
        <div className="lightbox" onClick={() => setActiveScreenshot(null)}>
          <img src={activeScreenshot} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-close" onClick={() => setActiveScreenshot(null)}><X size={20} /></button>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContact && (
        <div className="modal-overlay" onClick={() => setShowContact(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Contact Us — {product.name}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowContact(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleContactSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  {contactFields.map(field => (
                    <div key={field.fieldName} className="form-group" style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                      <label className="form-label">
                        {field.label} {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          className="form-textarea"
                          value={contactForm[field.fieldName] || ''}
                          onChange={(e) => setContactForm(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          className="form-select"
                          value={contactForm[field.fieldName] || ''}
                          onChange={(e) => setContactForm(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                          required={field.required}
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          className="form-input"
                          value={contactForm[field.fieldName] || ''}
                          onChange={(e) => setContactForm(prev => ({ ...prev, [field.fieldName]: e.target.value }))}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContact(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
