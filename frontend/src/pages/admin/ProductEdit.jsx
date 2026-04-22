import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, catalogAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Plus, Trash2, Upload, Image, Clock, AlertCircle } from 'lucide-react';
import './Admin.css';
import {
  validateLogoFile,
  validateScreenshotFile,
  validateResourceFile,
  validateTag,
  validateProductForm,
  LIMITS,
  LOGO_MAX_SIZE_MB,
  SCREENSHOT_MAX_PER_SECTION,
  RESOURCE_MAX_SIZE_MB,
} from '../../utils/productValidation';

const STEPS = ['Define Product', 'Listing Information', 'Product Information'];

function CharCount({ value, max, warn = 0.85 }) {
  const len = (value || '').length;
  const ratio = len / max;
  const color = ratio >= 1 ? '#ef4444' : ratio >= warn ? '#f59e0b' : '#9ca3af';
  return (
    <span style={{ fontSize: 11, color, float: 'right', marginTop: 2 }}>
      {len}/{max}
    </span>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 12 }}>
      <AlertCircle size={12} /> {msg}
    </div>
  );
}

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
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    developerName: '',
    logo: '',
    tags: [],
    overview: [],
    features: [],
    attributes: [],
    supportDescription: '',
    policies: '',
    resources: [],
    status: 'draft',
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
        overview: p.overview?.length
          ? p.overview
          : [{ title: '', description: '', screenshots: [] }],
        features: p.features?.length
          ? p.features
          : [{ title: '', description: '', screenshots: [] }],
        attributes: (p.attributes || []).map(a => ({
          attributeId: a.attributeId?._id || a.attributeId,
          attributeName: a.attributeId?.name || a.attributeName,
          values: a.values || [],
        })),
        supportDescription: p.supportDescription || '',
        policies: p.policies || '',
        resources: p.resources || [],
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

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };
  const setFieldError = (field, msg) =>
    setFieldErrors(prev => ({ ...prev, [field]: msg }));

  // ── Tag management ──────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    const result = validateTag(t, form.tags);
    if (!result.ok) { toast.error(result.error); return; }
    update('tags', [...form.tags, t]);
    setTagInput('');
  };
  const removeTag = (tag) => update('tags', form.tags.filter(t => t !== tag));

  // ── Repeater helpers ────────────────────────────────────────────────────────
  const addRepeaterItem = (field) =>
    update(field, [...form[field], { title: '', description: '', screenshots: [] }]);
  const removeRepeaterItem = (field, idx) =>
    update(field, form[field].filter((_, i) => i !== idx));
  const updateRepeater = (field, idx, key, val) => {
    const items = [...form[field]];
    items[idx] = { ...items[idx], [key]: val };
    update(field, items);
  };

  // ── Attribute management ────────────────────────────────────────────────────
  const toggleAttribute = (attr) => {
    const existing = form.attributes.find(a => a.attributeId === attr._id);
    if (existing) {
      update('attributes', form.attributes.filter(a => a.attributeId !== attr._id));
    } else {
      update('attributes', [
        ...form.attributes,
        { attributeId: attr._id, attributeName: attr.name, values: [] },
      ]);
    }
  };
  const setAttributeValues = (attrId, values) => {
    update('attributes', form.attributes.map(a =>
      a.attributeId === attrId ? { ...a, values } : a
    ));
  };

  // ── Logo upload ─────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const result = await validateLogoFile(file);
    if (!result.ok) {
      toast.error(result.error);
      setFieldError('logo', result.error);
      return;
    }
    setFieldError('logo', null);
    setUploadingLogo(true);
    try {
      const res = await uploadAPI.single(file);
      update('logo', res.data.url);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Screenshot upload ───────────────────────────────────────────────────────
  const handleMultipleFileUpload = async (field, idx, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const currentCount = form[field][idx].screenshots.length;
    if (currentCount >= SCREENSHOT_MAX_PER_SECTION) {
      toast.error(`Maximum ${SCREENSHOT_MAX_PER_SECTION} screenshots per section.`);
      return;
    }
    const available = SCREENSHOT_MAX_PER_SECTION - currentCount;
    const toUpload = files.slice(0, available);
    if (files.length > available) {
      toast(`Only ${available} more screenshot(s) can be added.`, { icon: '⚠️' });
    }

    for (const file of toUpload) {
      const check = validateScreenshotFile(file);
      if (!check.ok) { toast.error(`${file.name}: ${check.error}`); return; }
    }

    const key = `${field}-${idx}`;
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.multiple(toUpload);
      const urls = res.data.files.map(f => f.url);
      const items = [...form[field]];
      items[idx] = { ...items[idx], screenshots: [...items[idx].screenshots, ...urls] };
      update(field, items);
      toast.success(`${urls.length} screenshot(s) uploaded`);
    } catch {
      toast.error('Screenshot upload failed.');
    } finally {
      setUploadingScreenshots(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Resource upload ─────────────────────────────────────────────────────────
  const handleResourceUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateResourceFile(file);
    if (!check.ok) { toast.error(check.error); return; }

    const key = 'resource-upload';
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.single(file);
      update('resources', [...form.resources, { name: file.name, url: res.data.url }]);
      toast.success('Resource file added');
    } catch {
      toast.error('Resource upload failed.');
    } finally {
      setUploadingScreenshots(prev => ({ ...prev, [key]: false }));
    }
  };

  const removeResource = (idx) =>
    update('resources', form.resources.filter((_, i) => i !== idx));
  const removeScreenshot = (field, itemIdx, ssIdx) => {
    const items = [...form[field]];
    items[itemIdx] = {
      ...items[itemIdx],
      screenshots: items[itemIdx].screenshots.filter((_, i) => i !== ssIdx),
    };
    update(field, items);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async (status) => {
    const formErrors = validateProductForm(form);
    if (formErrors.length > 0) {
      formErrors.forEach(err => toast.error(err));
      return;
    }
    setSaving(true);
    try {
      await productAPI.update(id, { ...form, status });
      toast.success(status === 'published' ? 'Product published!' : 'Draft saved!');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared repeater renderer ────────────────────────────────────────────────
  const renderRepeaterSection = (field, label) => (
    <div className="wizard-section">
      <h3 className="wizard-section-title">{label}</h3>
      {(form[field] || []).map((item, idx) => (
        <div key={idx} className="repeater-item">
          {form[field].length > 1 && field === 'features' && (
            <button
              className="btn btn-icon btn-ghost repeater-remove"
              onClick={() => removeRepeaterItem(field, idx)}
            >
              <Trash2 size={14} />
            </button>
          )}
          <div className="form-group">
            <label className="form-label">
              Title
              <CharCount value={item.title} max={100} />
            </label>
            <input
              type="text"
              className="form-input"
              maxLength={100}
              value={item.title}
              onChange={(e) => updateRepeater(field, idx, 'title', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Description
              <CharCount value={item.description} max={5000} warn={0.9} />
            </label>
            <textarea
              className="form-textarea"
              maxLength={5000}
              value={item.description}
              onChange={(e) => updateRepeater(field, idx, 'description', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Screenshots
              <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                {item.screenshots.length}/{SCREENSHOT_MAX_PER_SECTION} · Max 5MB · JPEG/PNG/WebP/GIF
              </span>
            </label>
            <div className="screenshots-grid">
              {item.screenshots.map((ss, ssIdx) => (
                <div key={ssIdx} style={{ position: 'relative' }}>
                  <img src={ss} alt="" className="screenshot-thumb" />
                  <button
                    className="sliding-image-remove"
                    onClick={() => removeScreenshot(field, idx, ssIdx)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {item.screenshots.length < SCREENSHOT_MAX_PER_SECTION && (
                uploadingScreenshots[`${field}-${idx}`] ? (
                  <div className="screenshot-upload-btn" style={{ cursor: 'default' }}>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  </div>
                ) : (
                  <label className="screenshot-upload-btn">
                    <Image size={16} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) => handleMultipleFileUpload(field, idx, e)}
                      style={{ display: 'none' }}
                    />
                  </label>
                )
              )}
            </div>
          </div>
        </div>
      ))}
      {field === 'features' && (
        <button type="button" className="repeater-add" onClick={() => addRepeaterItem(field)}>
          <Plus size={16} /> Add Feature
        </button>
      )}
    </div>
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Edit Product</h1>
          <p>{form.name}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadLogs}>
            <Clock size={16} /> Edit Logs
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            onClick={() => setStep(i)}
            style={{ cursor: 'pointer' }}
          >
            <div className="step-number">{i < step ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Step 1 ────────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Define Your Product</h3>
            <div className="form-group">
              <label className="form-label">
                Product Name <span className="required">*</span>
                <CharCount value={form.name} max={LIMITS.name.max} />
              </label>
              <input
                type="text"
                className="form-input"
                maxLength={LIMITS.name.max}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                autoFocus
              />
              <FieldError msg={fieldErrors.name} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Required · 2–{LIMITS.name.max} characters
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 ────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Listing Information</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Tagline
                  <CharCount value={form.tagline} max={LIMITS.tagline.max} />
                </label>
                <input
                  type="text"
                  className="form-input"
                  maxLength={LIMITS.tagline.max}
                  value={form.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Optional · Max {LIMITS.tagline.max} characters
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Developer Name
                  <CharCount value={form.developerName} max={LIMITS.developerName.max} />
                </label>
                <input
                  type="text"
                  className="form-input"
                  maxLength={LIMITS.developerName.max}
                  value={form.developerName}
                  onChange={(e) => update('developerName', e.target.value)}
                />
              </div>
            </div>

            {/* Logo */}
            <div className="form-group">
              <label className="form-label">Product Logo</label>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                Accepted: JPEG, PNG, WebP, SVG · Max size: {LOGO_MAX_SIZE_MB}MB · Min 50×50px · Max 4096×4096px
              </div>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {uploadingLogo ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <div className="spinner mb-sm" style={{ margin: '0 auto 8px' }} />
                    <p>Uploading &amp; validating…</p>
                  </div>
                ) : form.logo ? (
                  <div style={{ padding: 12, textAlign: 'center' }}>
                    <img
                      src={form.logo}
                      alt="Logo"
                      className="image-preview"
                      style={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain', borderRadius: 8 }}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Click to replace</div>
                  </div>
                ) : (
                  <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <Upload size={24} />
                    <p>Upload logo</p>
                  </div>
                )}
              </div>
              <FieldError msg={fieldErrors.logo} />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">
                Tags
                <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                  {form.tags.length}/{LIMITS.maxTags} tags · Max {LIMITS.tag.max} chars each
                </span>
              </label>
              {form.tags.length < LIMITS.maxTags && (
                <div className="option-input-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add a tag"
                    maxLength={LIMITS.tag.max}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addTag}>Add</button>
                </div>
              )}
              <div className="flex gap-sm flex-wrap mt-sm">
                {form.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <span className="tag-remove" onClick={() => removeTag(tag)}>&times;</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {renderRepeaterSection('overview', 'Overview')}
          {renderRepeaterSection('features', 'Features')}
        </div>
      )}

      {/* ── Step 3 ────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Attributes</h3>
            {attributes.map(attr => {
              const formAttr = form.attributes.find(a => a.attributeId === attr._id);
              return (
                <div key={attr._id} className="repeater-item">
                  <div className="flex items-center justify-between mb-md">
                    <div>
                      <span style={{ fontWeight: 600 }}>{attr.name}</span>
                      {attr.requiredInProductEditor && <span className="required">*</span>}
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={!!formAttr}
                        onChange={() => toggleAttribute(attr)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {formAttr && attr.options.length > 0 && (
                    <div className="flex gap-sm flex-wrap">
                      {attr.options.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          className={`product-select-chip ${formAttr.values.includes(opt) ? 'selected' : ''}`}
                          onClick={() => {
                            const vals = formAttr.values.includes(opt)
                              ? formAttr.values.filter(v => v !== opt)
                              : [...formAttr.values, opt];
                            setAttributeValues(attr._id, vals);
                          }}
                        >
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
            <h3 className="wizard-section-title">Support &amp; Policies</h3>
            <div className="form-group">
              <label className="form-label">
                Support Description
                <CharCount value={form.supportDescription} max={LIMITS.supportDescription.max} />
              </label>
              <textarea
                className="form-textarea"
                maxLength={LIMITS.supportDescription.max}
                value={form.supportDescription}
                onChange={(e) => update('supportDescription', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Policies
                <CharCount value={form.policies} max={LIMITS.policies.max} />
              </label>
              <textarea
                className="form-textarea"
                maxLength={LIMITS.policies.max}
                value={form.policies}
                onChange={(e) => update('policies', e.target.value)}
              />
            </div>
          </div>

          <div className="wizard-section">
            <h3 className="wizard-section-title">Resources</h3>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
              Upload PDF, Word, Excel, CSV or TXT documentation · Max {RESOURCE_MAX_SIZE_MB}MB per file
            </p>
            {form.resources.map((resItem, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
              >
                <span style={{ flex: 1, fontSize: '14px' }}>{resItem.name}</span>
                <a href={resItem.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0183FF' }}>
                  Preview
                </a>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost repeater-remove"
                  onClick={() => removeResource(idx)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ marginTop: '16px' }}>
              {uploadingScreenshots['resource-upload'] ? (
                <div className="spinner mb-sm" />
              ) : (
                <label
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} /> Add Resource File
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt"
                    onChange={handleResourceUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="wizard-footer">
        <button
          className="btn btn-secondary"
          disabled={step === 0}
          onClick={() => setStep(s => s - 1)}
        >
          Previous
        </button>
        <div className="flex gap-sm">
          {step === STEPS.length - 1 ? (
            <>
              <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving}>
                {saving ? 'Saving…' : 'Publish'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next
            </button>
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
              {logs.length === 0 ? (
                <p className="text-muted">No edit logs yet.</p>
              ) : (
                <div className="edit-log-list">
                  {logs.map(log => (
                    <div key={log._id} className="edit-log-item">
                      <div className="edit-log-avatar">{log.editedBy?.firstName?.[0] || '?'}</div>
                      <div className="edit-log-content">
                        <div className="edit-log-name">
                          {log.editedBy?.firstName} {log.editedBy?.lastName}
                        </div>
                        <div className="edit-log-action">
                          <span className={`badge ${log.action === 'published' ? 'badge-success' : log.action === 'deleted' ? 'badge-danger' : 'badge-primary'}`}>
                            {log.action}
                          </span>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: '11px' }}>
                              Changed: {Object.keys(log.changes).join(', ')}
                            </span>
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
