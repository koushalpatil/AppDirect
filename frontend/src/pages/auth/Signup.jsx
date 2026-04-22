import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function Signup() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'user' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return toast.error('Please fill all required fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const user = await signup(form);
      toast.success(`Welcome, ${user.firstName}!`);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effect" />
      <div className="auth-card slide-up">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="brand-icon">A</div>
            <span className="brand-name">AppDirect</span>
          </div>
          <h1>Create account</h1>
          <p>Join AppDirect marketplace today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="John" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="Doe" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input type="email" className="form-input" placeholder="you@company.com" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <div className="input-with-icon">
              <input type={showPw ? 'text' : 'password'} className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => update('password', e.target.value)} required />
              <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
