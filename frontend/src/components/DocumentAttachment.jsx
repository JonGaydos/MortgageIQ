import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../utils/api';
import { fmtDate } from '../utils/formatters';
import Button from './ui/Button';
import Field from './ui/Field';
import Badge from './ui/Badge';

/**
 * Reusable document attachment component for bills, loan payments, insurance payments, etc.
 * Props:
 *  - linkedType: 'bill' | 'loan_payment' | 'insurance_payment' | 'maintenance'
 *  - linkedId: numeric ID of the linked entity (required to attach/show docs)
 *  - category: document category to use (e.g., 'utilities', 'mortgage', 'insurance')
 *  - compact: if true, shows a compact inline version
 */
export default function DocumentAttachment({ linkedType, linkedId, category = 'general', compact = false }) {
  const { authFetch, token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '', notes: '' });
  const [expanded, setExpanded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ original_name: '', file_path: '' });
  const fileRef = useRef();

  const loadDocs = async () => {
    if (!linkedId) return;
    setLoading(true);
    const res = await authFetch(`${API_BASE}/documents?linked_type=${linkedType}&linked_id=${linkedId}`);
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (linkedId) loadDocs();
  }, [linkedId]);

  const handleUpload = async (e, withAi = false) => {
    const file = e.target.files[0];
    if (!file || !linkedId) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('linked_type', linkedType);
      formData.append('linked_id', String(linkedId));

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (withAi) {
          await handleExtract(result.id);
        }
        loadDocs();
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || `Upload failed (${res.status})`);
      }
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExtract = async (id) => {
    setExtracting(id);
    await authFetch(`${API_BASE}/documents/${id}/extract`, { method: 'POST' });
    setExtracting(null);
    loadDocs();
  };

  const handleLinkUrl = async () => {
    if (!linkForm.title || !linkForm.url || !linkedId) return;
    await authFetch(`${API_BASE}/documents/link`, {
      method: 'POST',
      body: JSON.stringify({
        ...linkForm,
        category,
        linked_type: linkedType,
        linked_id: linkedId,
      }),
    });
    setShowLinkForm(false);
    setLinkForm({ title: '', url: '', notes: '' });
    loadDocs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this attached document?')) return;
    await authFetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    loadDocs();
  };

  const startEdit = (doc) => {
    setEditingId(doc.id);
    setEditForm({
      original_name: doc.original_name || '',
      file_path: doc.mime_type === 'application/link' ? doc.file_path || '' : '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updates = { original_name: editForm.original_name };
    const doc = docs.find(d => d.id === editingId);
    if (doc?.mime_type === 'application/link') updates.file_path = editForm.file_path;
    await authFetch(`${API_BASE}/documents/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setEditingId(null);
    loadDocs();
  };

  if (!linkedId) {
    return (
      <div className="text-xs text-warm-gray italic mt-2 p-2 bg-cream/20 rounded">
        {'\u{1F4CE}'} Save this entry first to attach documents, upload PDFs for AI processing, or link Paperless-NGX URLs.
      </div>
    );
  }

  // Compact mode: just a button that expands
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-warm-gray hover:text-gold flex items-center gap-1"
        title="Attach documents"
      >
        {'\u{1F4CE}'} {docs.length > 0 ? `${docs.length} doc${docs.length !== 1 ? 's' : ''}` : 'Attach'}
      </button>
    );
  }

  return (
    <div className="border border-card-border rounded-lg p-3 mt-3 bg-cream/10">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-warm-gray flex items-center gap-1">
          {'\u{1F4CE}'} Documents
          {docs.length > 0 && <Badge color="gray">{docs.length}</Badge>}
        </h4>
        {compact && (
          <button onClick={() => setExpanded(false)} className="text-xs text-warm-gray hover:text-gold">
            Close
          </button>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center justify-between text-xs text-danger bg-danger/10 rounded p-2 mb-2">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-2">&times;</button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap mb-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
          onChange={(e) => handleUpload(e, false)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs px-2.5 py-1.5 rounded border border-card-border text-warm-gray hover:border-gold hover:text-gold transition-all disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : '\u{1F4C4} Upload File'}
        </button>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
          id={`ai-upload-${linkedType}-${linkedId}`}
          onChange={(e) => handleUpload(e, true)}
        />
        <button
          onClick={() => document.getElementById(`ai-upload-${linkedType}-${linkedId}`)?.click()}
          disabled={uploading}
          className="text-xs px-2.5 py-1.5 rounded border border-card-border text-warm-gray hover:border-sage hover:text-sage transition-all disabled:opacity-50"
        >
          {'\u{1F916}'} Upload + AI Extract
        </button>
        <button
          onClick={() => setShowLinkForm(!showLinkForm)}
          className="text-xs px-2.5 py-1.5 rounded border border-card-border text-warm-gray hover:border-gold hover:text-gold transition-all"
        >
          {showLinkForm ? 'Cancel' : '\u{1F517} Link URL'}
        </button>
      </div>

      {/* Link URL form */}
      {showLinkForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-2 bg-cream/20 rounded">
          <Field label="Title">
            <input
              className="input-field text-xs"
              placeholder="Document name"
              value={linkForm.title}
              onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="URL">
            <input
              className="input-field text-xs"
              placeholder="https://paperless.example.com/..."
              value={linkForm.url}
              onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
            />
          </Field>
          <div className="flex items-end gap-1">
            <Button onClick={handleLinkUrl} className="text-xs">Save Link</Button>
          </div>
        </div>
      )}

      {/* Existing attachments */}
      {loading ? (
        <div className="text-xs text-warm-gray">Loading...</div>
      ) : docs.length > 0 ? (
        <div className="space-y-1">
          {docs.map(doc => {
            const isLink = doc.mime_type === 'application/link';
            const extracted = doc.ai_extracted || {};
            const isEditing = editingId === doc.id;

            if (isEditing) {
              return (
                <div key={doc.id} className="p-2 rounded bg-cream/30 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      className="input-field text-xs flex-1"
                      value={editForm.original_name}
                      onChange={e => setEditForm(f => ({ ...f, original_name: e.target.value }))}
                      placeholder="Document name"
                    />
                    {isLink && (
                      <input
                        className="input-field text-xs flex-1"
                        value={editForm.file_path}
                        onChange={e => setEditForm(f => ({ ...f, file_path: e.target.value }))}
                        placeholder="URL"
                      />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={saveEdit} className="text-xs px-2 py-0.5 rounded bg-gold/20 text-gold hover:bg-gold/30">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs px-2 py-0.5 text-warm-gray hover:text-foreground">Cancel</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={doc.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-cream/30">
                <span>{isLink ? '\u{1F517}' : '\u{1F4C4}'}</span>
                <span className="flex-1 truncate font-medium" title={doc.original_name}>
                  {isLink ? (
                    <a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                      {doc.original_name}
                    </a>
                  ) : doc.original_name}
                </span>
                {doc.ai_confidence != null && (
                  <Badge color={doc.ai_confidence >= 80 ? 'green' : 'orange'}>
                    AI: {doc.ai_confidence}%
                  </Badge>
                )}
                {extracted.amount && (
                  <span className="text-warm-gray">${extracted.amount}</span>
                )}
                {!isLink && !extracted.biller && (
                  <button
                    onClick={() => handleExtract(doc.id)}
                    disabled={extracting === doc.id}
                    className="text-warm-gray hover:text-sage"
                    title="Run AI extraction"
                  >
                    {extracting === doc.id ? '...' : '\u{1F916}'}
                  </button>
                )}
                <button
                  onClick={() => startEdit(doc)}
                  className="text-warm-gray hover:text-gold"
                  title="Edit"
                >
                  {'\u270F\uFE0F'}
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-warm-gray hover:text-danger"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-warm-gray">No documents attached yet.</div>
      )}
    </div>
  );
}
