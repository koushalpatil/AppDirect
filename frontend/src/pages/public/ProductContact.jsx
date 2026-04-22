import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Country, State } from 'country-state-city';
import './Public.css'; // Will use pub-modal CSS classes for styling

export default function ProductContact() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    companyName: '', companySize: '', street: '', suite: '',
    city: '', state: '', zipCode: '', country: 'US', notes: ''
  });
  
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [phoneCode, setPhoneCode] = useState('+1');

  useEffect(() => {
    loadProduct();
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    // Initialize standard US states
    setStates(State.getStatesOfCountry('US'));
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getPublicOne(id);
      setProduct(res.data.product);
    } catch {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    const selectedCountry = countries.find(c => c.isoCode === countryCode);
    setForm({ ...form, country: countryCode, state: '' });
    setStates(State.getStatesOfCountry(countryCode));
    setPhoneCode(selectedCountry ? `+${selectedCountry.phonecode}` : '');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    /* Validation simplified */
    if (!form.email || !form.companyName || !form.companySize) {
      return toast.error('Please fill required fields');
    }
    
    // Simulate submission to backend API
    const loadingToast = toast.loading('Submitting inquiry...');
    setTimeout(() => {
      toast.dismiss(loadingToast);
      setIsSubmitted(true);
    }, 1200);
  };

  if (loading) return <div className="pub-loader" style={{ minHeight: '60vh' }}><div className="pub-spinner" /></div>;
  if (!product) return null;

  return (
    <div className="pc-page-wrapper" style={{ padding: '40px 24px', background: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div className="pub-modal" style={{ maxWidth: '900px', position: 'relative', height: 'fit-content', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <div className="pub-modal-header" style={{ padding: '24px 32px' }}>
          <h3 style={{ fontSize: '24px' }}>{isSubmitted ? 'Information Submitted' : 'Submit your information'}</h3>
          <button className="pub-modal-close" onClick={() => navigate(`/products/${id}`)}>
            <X size={24} />
          </button>
        </div>
        
        {isSubmitted ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', marginBottom: 24 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Thank you for reaching out!</h2>
            <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              We have received your details. A representative will be in touch with you shortly.
            </p>
            <button 
              onClick={() => navigate(`/products/${id}`)}
              style={{ background: '#0183FF', color: '#fff', padding: '12px 32px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
              Return to Product
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            
            {/* Row 1 */}
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">First Name</label>
              <input type="text" name="firstName" className="pub-form-input" value={form.firstName} onChange={handleChange} />
            </div>
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Last Name</label>
              <input type="text" name="lastName" className="pub-form-input" value={form.lastName} onChange={handleChange} />
            </div>

            {/* Row 2 */}
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Email <span className="required">*</span></label>
              <input type="email" name="email" className="pub-form-input" value={form.email} onChange={handleChange} required />
            </div>
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Phone</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="pub-form-input" value={phoneCode} disabled style={{ width: '60px', background: '#f1f5f9', textAlign: 'center' }} />
                <input type="text" name="phone" className="pub-form-input" style={{ flex: 1 }} value={form.phone} onChange={handleChange} />
              </div>
            </div>

            {/* Row 3 */}
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Company Name <span className="required">*</span></label>
              <input type="text" name="companyName" className="pub-form-input" value={form.companyName} onChange={handleChange} required />
            </div>
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Company Size <span className="required">*</span></label>
              <select name="companySize" className="pub-form-select" value={form.companySize} onChange={handleChange} required>
                <option value="">Select</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>

            {/* Row 4 */}
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Street</label>
              <input type="text" name="street" className="pub-form-input" value={form.street} onChange={handleChange} />
            </div>
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">Suite</label>
              <input type="text" name="suite" className="pub-form-input" value={form.suite} onChange={handleChange} />
            </div>

            {/* Row 5 */}
            <div className="pub-form-group" style={{ marginBottom: 0 }}>
              <label className="pub-form-label">City</label>
              <input type="text" name="city" className="pub-form-input" value={form.city} onChange={handleChange} />
            </div>
            <div className="pub-form-group" style={{ marginBottom: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="pub-form-label">State</label>
                <select name="state" className="pub-form-select" value={form.state} onChange={handleChange}>
                  <option value="">Select</option>
                  {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="pub-form-label">Zip Code</label>
                <input type="text" name="zipCode" className="pub-form-input" value={form.zipCode} onChange={handleChange} />
              </div>
            </div>

            {/* Row 6 */}
            <div className="pub-form-group" style={{ marginBottom: 0, gridColumn: '1 / 2' }}>
              <label className="pub-form-label">Country</label>
              <select name="country" className="pub-form-select" value={form.country} onChange={handleCountryChange}>
                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>

            {/* Row 7 */}
            <div className="pub-form-group" style={{ gridColumn: '1 / -1', marginBottom: 0, marginTop: '8px' }}>
              <label className="pub-form-label">Notes</label>
              <textarea 
                name="notes" 
                className="pub-form-textarea" 
                style={{ height: '120px', resize: 'vertical' }}
                placeholder="Please specify any details" 
                value={form.notes} 
                onChange={handleChange} 
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>400</div>
            </div>
          </div>
          
          <button type="submit" style={{ background: '#0f172a', color: '#fff', padding: '10px 32px', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
            Send
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
