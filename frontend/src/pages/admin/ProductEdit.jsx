import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, catalogAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Plus, Trash2, Upload, Image, Clock } from 'lucide-react';
import './Admin.css';

const STEPS = ['Define Product', 'Listing Information', 'Product Information'];

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState({});

  const [form, setForm] = useState({
    name: '', tagline: '', developerName: '', logo: '', tags: [],
    overview: [], features: [], attributes: [],
    supportDescription: '', policies: '', status: 'draft',
  });

  useEffect(() => { loadProduct(); loadAttributes(); }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getOne(id);
      const p = res.data.product;
      setForm({
        name: p.name || '',
        tagline: p.tagline || '',
        developerName: p.developerName || '',
        logo: p.logo || '',
        tags: p.tags || [],
        overview: p.overview?.length ? p.overview : [{ title: '', description: '', screenshots: [] }],
        features: p.features?.length ? p.features : [{ title: '', description: '', screenshots: [] }],
        attributes: (p.attributes || []).map(a => ({
          attributeId: a.attributeId?._id || a.attributeId,
          attributeName: a.attributeId?.name || a.attributeName,
          values: a.values || [],
        })),
        supportDescription: p.supportDescription || '',
        policies: p.policies || '',
        status: p.status || 'draft',
      });
    } catch {
      toast.error('Failed to load product');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const loadAttributes = async () => {
    try {
      const res = await catalogAPI.getAll();
      setAttributes(res.data.attributes || []);
    } catch {}
  };

  const loadLogs = async () => {
    try {
      const res = await productAPI.getLogs(id);
      setLogs(res.data.logs || []);
      setShowLogs(true);
    } catch {
      toast.error('Failed to load edit logs');
    }
  };

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const addTag = () => { const t = tagInput.trim(); if (t && !form.tags.includes(t)) { update('tags', [...form.tags, t]); setTagInput(''); } };
  const removeTag = (tag) => update('tags', form.tags.filter(t => t !== tag));

  const addRepeaterItem = (field) => update(field, [...form[field], { title: '', description: '', screenshots: [] }]);
  const removeRepeaterItem = (field, idx) => update(field, form[field].filter((_, i) => i !== idx));
  const updateRepeater = (field, idx, key, val) => { const items = [...form[field]]; items[idx] = { ...items[idx], [key]: val }; update(field, items); };

  const toggleAttribute = (attr) => {
    const existing = form.attributes.find(a => a.attributeId === attr._id);
    if (existing) update('attributes', form.attributes.filter(a => a.attributeId !== attr._id));
    else update('attributes', [...form.attributes, { attributeId: attr._id, attributeName: attr.name, values: [] }]);
  };
  const setAttributeValues = (attrId, values) => {
    update('attributes', form.attributes.map(a => a.attributeId === attrId ? { ...a, values } : a));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    try { const res = await uploadAPI.single(file); update('logo', res.data.url); toast.success('Logo uploaded'); } catch { toast.error('Upload failed'); }
    finally { setUploadingLogo(false); }
  };

  const handleScreenshotUpload = async (field, idx, e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    const key = `${field}-${idx}`;
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.multiple(files);
      const urls = res.data.files.map(f => f.url);
      const items = [...form[field]]; items[idx] = { ...items[idx], screenshots: [...items[idx].screenshots, ...urls] }; update(field, items);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingScreenshots(prev => ({...prev, [key]: false})); }
  };
  const removeScreenshot = (field, itemIdx, ssIdx) => {
    const items = [...form[field]]; items[itemIdx] = { ...items[itemIdx], screenshots: items[itemIdx].screenshots.filter((_, i) => i !== ssIdx) }; update(field, items);
  };

  const handleSave = async (status) => {
    if (!form.name.trim()) return toast.error('Product name is required');
    setSaving(true);
    try {
      await productAPI.update(id, { ...form, status });
      toast.success(status === 'published' ? 'Product published!' : 'Draft saved!');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Edit Product</h1>
          <p>{form.name}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadLogs}><Clock size={16} /> Edit Logs</button>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, i) => (
          <div key={i} className={`step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} onClick={() => setStep(i)} style={{ cursor: 'pointer' }}>
            <div className="step-number">{i < step ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 0 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Define Your Product</h3>
            <div className="form-group">
              <label className="form-label">Product Name <span className="required">*</span></label>
              <input type="text" className="form-input" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Listing Information</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tagline</label>
                <input type="text" className="form-input" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Developer Name</label>
                <input type="text" className="form-input" value={form.developerName} onChange={(e) => update('developerName', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Product Logo</label>
              <div className="image-upload-area">
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                {uploadingLogo ? <div style={{ padding: 20, color: 'var(--text-muted)' }}><div className="spinner mb-sm" style={{ margin: '0 auto 8px' }} /><p>Uploading...</p></div> : form.logo ? <img src={form.logo} alt="Logo" className="image-preview" style={{ maxHeight: 120, objectFit: 'contain' }} /> : <div style={{ padding: 20, color: 'var(--text-muted)' }}><Upload size={24} /><p>Upload logo</p></div>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <div className="option-input-row">
                <input type="text" className="form-input" placeholder="Add a tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                <button type="button" className="btn btn-secondary" onClick={addTag}>Add</button>
              </div>
              <div className="flex gap-sm flex-wrap mt-sm">
                {form.tags.map(tag => <span key={tag} className="tag">{tag}<span className="tag-remove" onClick={() => removeTag(tag)}>&times;</span></span>)}
              </div>
            </div>
          </div>

          <div className="wizard-section">
            <h3 className="wizard-section-title">Overview</h3>
            {form.overview.map((item, idx) => (
              <div key={idx} className="repeater-item">
                {form.overview.length > 1 && <button className="btn btn-icon btn-ghost repeater-remove" onClick={() => removeRepeaterItem('overview', idx)}><Trash2 size={14} /></button>}
                <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={item.title} onChange={(e) => updateRepeater('overview', idx, 'title', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={item.description} onChange={(e) => updateRepeater('overview', idx, 'description', e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Screenshots</label>
                  <div className="screenshots-grid">
                    {item.screenshots.map((ss, ssIdx) => <div key={ssIdx} style={{ position: 'relative' }}><img src={ss} alt="" className="screenshot-thumb" /><button className="sliding-image-remove" onClick={() => removeScreenshot('overview', idx, ssIdx)}>&times;</button></div>)}
                    {uploadingScreenshots[`overview-${idx}`] ? <div className="screenshot-upload-btn" style={{ cursor: 'default' }}><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /></div> : <label className="screenshot-upload-btn"><Image size={16} /><input type="file" accept="image/*" multiple onChange={(e) => handleScreenshotUpload('overview', idx, e)} style={{ display: 'none' }} /></label>}
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="repeater-add" onClick={() => addRepeaterItem('overview')}><Plus size={16} /> Add Overview Section</button>
          </div>

          <div className="wizard-section">
            <h3 className="wizard-section-title">Features</h3>
            {form.features.map((item, idx) => (
              <div key={idx} className="repeater-item">
                {form.features.length > 1 && <button className="btn btn-icon btn-ghost repeater-remove" onClick={() => removeRepeaterItem('features', idx)}><Trash2 size={14} /></button>}
                <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={item.title} onChange={(e) => updateRepeater('features', idx, 'title', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={item.description} onChange={(e) => updateRepeater('features', idx, 'description', e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label">Screenshots</label>
                  <div className="screenshots-grid">
                    {item.screenshots.map((ss, ssIdx) => <div key={ssIdx} style={{ position: 'relative' }}><img src={ss} alt="" className="screenshot-thumb" /><button className="sliding-image-remove" onClick={() => removeScreenshot('features', idx, ssIdx)}>&times;</button></div>)}
                    {uploadingScreenshots[`features-${idx}`] ? <div className="screenshot-upload-btn" style={{ cursor: 'default' }}><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /></div> : <label className="screenshot-upload-btn"><Image size={16} /><input type="file" accept="image/*" multiple onChange={(e) => handleScreenshotUpload('features', idx, e)} style={{ display: 'none' }} /></label>}
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="repeater-add" onClick={() => addRepeaterItem('features')}><Plus size={16} /> Add Feature</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 2 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Attributes</h3>
            {attributes.map(attr => {
              const formAttr = form.attributes.find(a => a.attributeId === attr._id);
              return (
                <div key={attr._id} className="repeater-item">
                  <div className="flex items-center justify-between mb-md">
                    <div><span style={{ fontWeight: 600 }}>{attr.name}</span>{attr.requiredInProductEditor && <span className="required">*</span>}</div>
                    <label className="toggle"><input type="checkbox" checked={!!formAttr} onChange={() => toggleAttribute(attr)} /><span className="toggle-slider" /></label>
                  </div>
                  {formAttr && attr.options.length > 0 && (
                    <div className="flex gap-sm flex-wrap">
                      {attr.options.map(opt => (
                        <button key={opt} type="button" className={`product-select-chip ${formAttr.values.includes(opt) ? 'selected' : ''}`}
                          onClick={() => { const vals = formAttr.values.includes(opt) ? formAttr.values.filter(v => v !== opt) : [...formAttr.values, opt]; setAttributeValues(attr._id, vals); }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="wizard-section">
            <h3 className="wizard-section-title">Support & Policies</h3>
            <div className="form-group"><label className="form-label">Support Description</label><textarea className="form-textarea" value={form.supportDescription} onChange={(e) => update('supportDescription', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Policies</label><textarea className="form-textarea" value={form.policies} onChange={(e) => update('policies', e.target.value)} /></div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="wizard-footer">
        <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Previous</button>
        <div className="flex gap-sm">
          {step === STEPS.length - 1 ? (
            <>
              <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>Save as Draft</button>
              <button className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving}>{saving ? 'Saving...' : 'Publish'}</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
          )}
        </div>
      </div>

      {/* Edit Logs Modal */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Logs</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowLogs(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {logs.length === 0 ? <p className="text-muted">No edit logs yet.</p> : (
                <div className="edit-log-list">
                  {logs.map(log => (
                    <div key={log._id} className="edit-log-item">
                      <div className="edit-log-avatar">{log.editedBy?.firstName?.[0] || '?'}</div>
                      <div className="edit-log-content">
                        <div className="edit-log-name">{log.editedBy?.firstName} {log.editedBy?.lastName}</div>
                        <div className="edit-log-action">
                          <span className={`badge ${log.action === 'published' ? 'badge-success' : log.action === 'deleted' ? 'badge-danger' : 'badge-primary'}`}>{log.action}</span>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: '11px' }}>Changed: {Object.keys(log.changes).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="edit-log-time">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
