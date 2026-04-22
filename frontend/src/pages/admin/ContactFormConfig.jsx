import { useState, useEffect, useCallback } from 'react';
import { configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, GripVertical, X, ArrowUp, ArrowDown } from 'lucide-react';
import './Admin.css';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown (Select)' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'date', label: 'Date Picker' },
  { value: 'file', label: 'File Upload' },
];

const buildEmptyField = (order) => ({
  fieldName: '',
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  helpText: '',
  defaultValue: '',
  options: [],
  validations: {
    minLength: '',
    maxLength: '',
    regex: '',
    min: '',
    max: '',
    step: '',
    minDate: '',
    maxDate: '',
  },
  isDefault: false,
  order,
});

const normalizeKey = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_\s]/g, '')
  .replace(/\s+/g, '_')
  .replace(/^\d+/, '')
  .replace(/^_+/, '')
  .replace(/_+/g, '_')
  .toLowerCase();

export default function ContactFormConfig() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [optionInput, setOptionInput] = useState({ label: '', value: '' });
  const [modalErrors, setModalErrors] = useState({});
  const [fieldForm, setFieldForm] = useState(buildEmptyField(0));

  const loadConfig = useCallback(async () => {
    try {
      const res = await configAPI.getContact();
      const contactFields = (res.data.config?.contactFields || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((f, idx) => ({ ...buildEmptyField(idx), ...f, order: idx }));
      setFields(contactFields);
    } catch {
      toast.error('Failed to load contact form config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const openAddField = () => {
    setFieldForm(buildEmptyField(fields.length));
    setOptionInput({ label: '', value: '' });
    setModalErrors({});
    setEditIndex(null);
    setModalOpen(true);
  };

  const openEditField = (field, idx) => {
    setFieldForm({
      ...buildEmptyField(idx),
      ...field,
      options: Array.isArray(field.options) ? field.options : [],
      validations: { ...buildEmptyField(idx).validations, ...(field.validations || {}) },
      defaultValue: field.defaultValue ?? (field.type === 'checkbox' ? [] : ''),
    });
    setOptionInput({ label: '', value: '' });
    setModalErrors({});
    setEditIndex(idx);
    setModalOpen(true);
  };

  const addOption = () => {
    const label = optionInput.label.trim();
    const value = (optionInput.value || optionInput.label).trim();
    if (!label || !value) return;
    if ((fieldForm.options || []).some((o) => o.value === value)) {
      toast.error('Option value must be unique');
      return;
    }
    setFieldForm((prev) => ({ ...prev, options: [...(prev.options || []), { label, value }] }));
    setOptionInput({ label: '', value: '' });
  };

  const removeOption = (optionValue) => {
    setFieldForm((prev) => {
      const options = (prev.options || []).filter((o) => o.value !== optionValue);
      let defaultValue = prev.defaultValue;
      if (prev.type === 'checkbox' && Array.isArray(defaultValue)) {
        defaultValue = defaultValue.filter((v) => v !== optionValue);
      }
      if ((prev.type === 'select' || prev.type === 'radio') && defaultValue === optionValue) {
        defaultValue = '';
      }
      return { ...prev, options, defaultValue };
    });
  };

  const moveField = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next.map((f, i) => ({ ...f, order: i })));
  };

  const validateFieldForm = () => {
    const errs = {};
    const label = fieldForm.label.trim();
    const fieldName = normalizeKey(fieldForm.fieldName || label);
    const options = fieldForm.options || [];
    const validations = fieldForm.validations || {};

    if (!label) errs.label = 'Label is required';
    if (!fieldName) errs.fieldName = 'Field name is required';

    const duplicate = fields.some((f, idx) => idx !== editIndex && normalizeKey(f.fieldName) === fieldName);
    if (duplicate) errs.fieldName = 'Field name must be unique';

    if (['select', 'radio', 'checkbox'].includes(fieldForm.type) && options.length === 0) {
      errs.options = 'Add at least one option';
    }

    const minLength = validations.minLength === '' ? undefined : Number(validations.minLength);
    const maxLength = validations.maxLength === '' ? undefined : Number(validations.maxLength);
    if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
      errs.minLength = 'Min length cannot be greater than max length';
    }

    const min = validations.min === '' ? undefined : Number(validations.min);
    const max = validations.max === '' ? undefined : Number(validations.max);
    if (min !== undefined && max !== undefined && min > max) {
      errs.min = 'Min value cannot be greater than max value';
    }

    if (validations.regex) {
      try {
        // eslint-disable-next-line no-new
        new RegExp(validations.regex);
      } catch {
        errs.regex = 'Invalid regex pattern';
      }
    }

    setModalErrors(errs);
    return { isValid: Object.keys(errs).length === 0, fieldName };
  };

  const handleSaveField = () => {
    const { isValid, fieldName } = validateFieldForm();
    if (!isValid) return;

    const updatedFields = [...fields];
    const data = {
      ...fieldForm,
      fieldName,
      placeholder: fieldForm.placeholder?.trim() || '',
      helpText: fieldForm.helpText?.trim() || '',
      options: (fieldForm.options || []).map((o) => ({
        label: o.label.trim(),
        value: o.value.trim(),
      })),
      validations: {
        minLength: fieldForm.validations.minLength === '' ? undefined : Number(fieldForm.validations.minLength),
        maxLength: fieldForm.validations.maxLength === '' ? undefined : Number(fieldForm.validations.maxLength),
        regex: fieldForm.validations.regex?.trim() || undefined,
        min: fieldForm.validations.min === '' ? undefined : Number(fieldForm.validations.min),
        max: fieldForm.validations.max === '' ? undefined : Number(fieldForm.validations.max),
        step: fieldForm.validations.step === '' ? undefined : Number(fieldForm.validations.step),
        minDate: fieldForm.validations.minDate || undefined,
        maxDate: fieldForm.validations.maxDate || undefined,
      },
      order: editIndex !== null ? fields[editIndex].order : fields.length,
    };

    if (editIndex !== null) {
      updatedFields[editIndex] = data;
    } else {
      updatedFields.push(data);
    }
    setFields(updatedFields.map((f, i) => ({ ...f, order: i })));
    setModalOpen(false);
  };

  const removeField = (idx) => {
    if (fields[idx].isDefault && !window.confirm('This is a default field. Remove it?')) return;
    setFields(fields.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = fields.map((f, idx) => ({ ...f, order: idx }));
      await configAPI.updateContact({ contactFields: payload });
      toast.success('Contact form configuration saved');
      await loadConfig();
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to save configuration';
      const apiErrors = err?.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        toast.error(`${message} ${apiErrors[0]}`);
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Contact Form Configuration</h1>
          <p>Manage the fields displayed in the contact form</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={openAddField}>
            <Plus size={16} /> Add Field
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="config-field-list">
        {fields.map((field, idx) => (
          <div key={idx} className="config-field-item">
            <GripVertical size={16} className="text-muted" style={{ cursor: 'grab' }} />
            <div className="config-field-info">
              <div className="config-field-name">
                {field.label}
                {field.required && <span className="required" style={{ marginLeft: 4 }}>*</span>}
                {field.isDefault && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Default</span>}
              </div>
              <div className="config-field-type">Type: {field.type} | Field: {field.fieldName}</div>
            </div>
            <div className="config-field-actions">
              <button className="btn btn-icon btn-ghost" onClick={() => moveField(idx, -1)} disabled={idx === 0} title="Move up"><ArrowUp size={14} /></button>
              <button className="btn btn-icon btn-ghost" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} title="Move down"><ArrowDown size={14} /></button>
              <button className="btn btn-icon btn-ghost" onClick={() => openEditField(field, idx)}><Edit3 size={14} /></button>
              <button className="btn btn-icon btn-ghost" onClick={() => removeField(idx)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editIndex !== null ? 'Edit Field' : 'Add Field'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Label <span className="required">*</span></label>
                  <input type="text" className="form-input" value={fieldForm.label} onChange={(e) => setFieldForm(p => ({ ...p, label: e.target.value }))} />
                  {modalErrors.label && <small className="text-danger">{modalErrors.label}</small>}
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={fieldForm.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFieldForm((p) => ({
                        ...p,
                        type: nextType,
                        options: ['select', 'radio', 'checkbox'].includes(nextType) ? p.options : [],
                        defaultValue: nextType === 'checkbox' ? (Array.isArray(p.defaultValue) ? p.defaultValue : []) : (typeof p.defaultValue === 'string' ? p.defaultValue : ''),
                      }));
                    }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Field Name (unique key)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="auto generated from label"
                    value={fieldForm.fieldName}
                    onChange={(e) => setFieldForm((p) => ({ ...p, fieldName: e.target.value }))}
                  />
                  {modalErrors.fieldName && <small className="text-danger">{modalErrors.fieldName}</small>}
                </div>
                <div className="form-group">
                  <label className="form-label">Default Value</label>
                  {['select', 'radio'].includes(fieldForm.type) ? (
                    <select
                      className="form-select"
                      value={fieldForm.defaultValue || ''}
                      onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))}
                    >
                      <option value="">None</option>
                      {(fieldForm.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : fieldForm.type === 'checkbox' ? (
                    <div className="attribute-options">
                      {(fieldForm.options || []).map((opt) => {
                        const checked = Array.isArray(fieldForm.defaultValue) && fieldForm.defaultValue.includes(opt.value);
                        return (
                          <label key={opt.value} className="product-select-chip" style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setFieldForm((p) => {
                                const current = Array.isArray(p.defaultValue) ? p.defaultValue : [];
                                const next = current.includes(opt.value)
                                  ? current.filter((v) => v !== opt.value)
                                  : [...current, opt.value];
                                return { ...p, defaultValue: next };
                              })}
                            />
                            <span style={{ marginLeft: 6 }}>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : fieldForm.type === 'date' ? (
                    <input type="date" className="form-input" value={fieldForm.defaultValue || ''} onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))} />
                  ) : fieldForm.type === 'file' ? (
                    <input type="text" className="form-input" value="" disabled placeholder="Default not supported for file field" />
                  ) : (
                    <input type="text" className="form-input" value={fieldForm.defaultValue || ''} onChange={(e) => setFieldForm((p) => ({ ...p, defaultValue: e.target.value }))} />
                  )}
                </div>
              </div>
              {!['radio', 'checkbox'].includes(fieldForm.type) && (
                <div className="form-group">
                  <label className="form-label">Placeholder</label>
                  <input type="text" className="form-input" value={fieldForm.placeholder || ''} onChange={(e) => setFieldForm(p => ({ ...p, placeholder: e.target.value }))} />
                </div>
              )}
              {!['radio', 'checkbox'].includes(fieldForm.type) && (
                <div className="form-group">
                  <label className="form-label">Help text / Description</label>
                  <input type="text" className="form-input" value={fieldForm.helpText || ''} onChange={(e) => setFieldForm(p => ({ ...p, helpText: e.target.value }))} />
                </div>
              )}
              <div className="toggle-wrapper">
                <span className="toggle-label">Required field</span>
                <label className="toggle"><input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm(p => ({ ...p, required: e.target.checked }))} /><span className="toggle-slider" /></label>
              </div>

              {['select', 'radio', 'checkbox'].includes(fieldForm.type) && (
                <div className="form-group mt-md">
                  <label className="form-label">Options</label>
                  <div className="option-input-row">
                    <input type="text" className="form-input" placeholder="Option label" value={optionInput.label} onChange={(e) => setOptionInput((p) => ({ ...p, label: e.target.value }))} />
                    <input type="text" className="form-input" placeholder="Option value (optional)" value={optionInput.value} onChange={(e) => setOptionInput((p) => ({ ...p, value: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                    <button type="button" className="btn btn-secondary" onClick={addOption}>Add</button>
                  </div>
                  {modalErrors.options && <small className="text-danger">{modalErrors.options}</small>}
                  <div className="flex gap-sm flex-wrap mt-sm">
                    {(fieldForm.options || []).map((opt) => (
                      <span key={opt.value} className="tag">{opt.label} ({opt.value})<span className="tag-remove" onClick={() => removeOption(opt.value)}>&times;</span></span>
                    ))}
                  </div>
                </div>
              )}

              {(fieldForm.type === 'text' || fieldForm.type === 'textarea' || fieldForm.type === 'tel') && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Min length</label>
                    <input type="number" className="form-input" value={fieldForm.validations.minLength} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, minLength: e.target.value } }))} />
                    {modalErrors.minLength && <small className="text-danger">{modalErrors.minLength}</small>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max length</label>
                    <input type="number" className="form-input" value={fieldForm.validations.maxLength} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, maxLength: e.target.value } }))} />
                  </div>
                </div>
              )}

              {(fieldForm.type === 'text' || fieldForm.type === 'textarea' || fieldForm.type === 'tel') && (
                <div className="form-group">
                  <label className="form-label">Regex validation (optional)</label>
                  <input type="text" className="form-input" value={fieldForm.validations.regex} placeholder="e.g. ^[A-Za-z ]+$" onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, regex: e.target.value } }))} />
                  {modalErrors.regex && <small className="text-danger">{modalErrors.regex}</small>}
                </div>
              )}

              {fieldForm.type === 'number' && (
                <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Min value</label>
                    <input type="number" className="form-input" value={fieldForm.validations.min} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, min: e.target.value } }))} />
                    {modalErrors.min && <small className="text-danger">{modalErrors.min}</small>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max value</label>
                    <input type="number" className="form-input" value={fieldForm.validations.max} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, max: e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Step</label>
                    <input type="number" className="form-input" value={fieldForm.validations.step} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, step: e.target.value } }))} />
                  </div>
                </div>
              )}

              {fieldForm.type === 'date' && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Min date</label>
                    <input type="date" className="form-input" value={fieldForm.validations.minDate} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, minDate: e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max date</label>
                    <input type="date" className="form-input" value={fieldForm.validations.maxDate} onChange={(e) => setFieldForm((p) => ({ ...p, validations: { ...p.validations, maxDate: e.target.value } }))} />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveField}>Save Field</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
