import { useState, useEffect } from 'react';
import { configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, GripVertical, X } from 'lucide-react';
import './Admin.css';

export default function ContactFormConfig() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [optionInput, setOptionInput] = useState('');

  const [fieldForm, setFieldForm] = useState({
    fieldName: '', label: '', type: 'text', required: false, placeholder: '', options: [], isDefault: false, order: 0,
  });

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await configAPI.getContact();
      setFields(res.data.config?.contactFields || []);
    } catch {
      toast.error('Failed to load contact form config');
    } finally {
      setLoading(false);
    }
  };

  const openAddField = () => {
    setFieldForm({ fieldName: '', label: '', type: 'text', required: false, placeholder: '', options: [], isDefault: false, order: fields.length });
    setEditIndex(null);
    setModalOpen(true);
  };

  const openEditField = (field, idx) => {
    setFieldForm({ ...field });
    setEditIndex(idx);
    setModalOpen(true);
  };

  const addOption = () => {
    const o = optionInput.trim();
    if (o && !fieldForm.options.includes(o)) {
      setFieldForm(prev => ({ ...prev, options: [...prev.options, o] }));
      setOptionInput('');
    }
  };

  const handleSaveField = () => {
    if (!fieldForm.label.trim()) return toast.error('Label is required');
    const fieldName = fieldForm.fieldName || fieldForm.label.replace(/\s+/g, '').charAt(0).toLowerCase() + fieldForm.label.replace(/\s+/g, '').slice(1);

    const updatedFields = [...fields];
    const data = { ...fieldForm, fieldName };

    if (editIndex !== null) {
      updatedFields[editIndex] = data;
    } else {
      updatedFields.push(data);
    }
    setFields(updatedFields);
    setModalOpen(false);
  };

  const removeField = (idx) => {
    if (fields[idx].isDefault && !window.confirm('This is a default field. Remove it?')) return;
    setFields(fields.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await configAPI.updateContact({ contactFields: fields });
      toast.success('Contact form configuration saved');
    } catch {
      toast.error('Failed to save configuration');
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
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={fieldForm.type} onChange={(e) => setFieldForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="number">Number</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Placeholder</label>
                <input type="text" className="form-input" value={fieldForm.placeholder || ''} onChange={(e) => setFieldForm(p => ({ ...p, placeholder: e.target.value }))} />
              </div>
              <div className="toggle-wrapper">
                <span className="toggle-label">Required field</span>
                <label className="toggle"><input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm(p => ({ ...p, required: e.target.checked }))} /><span className="toggle-slider" /></label>
              </div>

              {fieldForm.type === 'select' && (
                <div className="form-group mt-md">
                  <label className="form-label">Options</label>
                  <div className="option-input-row">
                    <input type="text" className="form-input" placeholder="Add option" value={optionInput} onChange={(e) => setOptionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                    <button type="button" className="btn btn-secondary" onClick={addOption}>Add</button>
                  </div>
                  <div className="flex gap-sm flex-wrap mt-sm">
                    {fieldForm.options.map(opt => <span key={opt} className="tag">{opt}<span className="tag-remove" onClick={() => setFieldForm(p => ({ ...p, options: p.options.filter(o => o !== opt) }))}>&times;</span></span>)}
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
