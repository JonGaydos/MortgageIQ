import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../utils/api';
import { fmtDate } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Field from '../../components/ui/Field';

const TASK_CATEGORIES = [
  { value: 'general', label: 'General', icon: '\u{1F527}' },
  { value: 'hvac', label: 'HVAC', icon: '\u2744\uFE0F' },
  { value: 'plumbing', label: 'Plumbing', icon: '\u{1F6BF}' },
  { value: 'electrical', label: 'Electrical', icon: '\u26A1' },
  { value: 'exterior', label: 'Exterior', icon: '\u{1F3E1}' },
  { value: 'appliance', label: 'Appliance', icon: '\u{1F9F9}' },
  { value: 'landscaping', label: 'Landscaping', icon: '\u{1F33F}' },
  { value: 'safety', label: 'Safety', icon: '\u{1F6E1}\uFE0F' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'orange' },
  { value: 'high', label: 'High', color: 'red' },
];

const FREQUENCIES = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

const ASSET_CATEGORIES = [
  { value: 'appliance', label: 'Appliance' },
  { value: 'hvac', label: 'HVAC System' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];

export default function MaintenancePage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const [tab, setTab] = useState('tasks');
  const [taskData, setTaskData] = useState(null);
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [completeForm, setCompleteForm] = useState(null);

  const loadData = async () => {
    const [tasksRes, assetsRes] = await Promise.all([
      authFetch(`${API_BASE}/maintenance/tasks`),
      authFetch(`${API_BASE}/maintenance/assets`),
    ]);
    if (tasksRes.ok) setTaskData(await tasksRes.json());
    if (assetsRes.ok) setAssetData(await assetsRes.json());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Task CRUD
  const saveTask = async (formData) => {
    const url = editTask ? `${API_BASE}/maintenance/tasks/${editTask.id}` : `${API_BASE}/maintenance/tasks`;
    const res = await authFetch(url, { method: editTask ? 'PUT' : 'POST', body: JSON.stringify(formData) });
    if (res.ok) { setShowTaskForm(false); setEditTask(null); loadData(); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    await authFetch(`${API_BASE}/maintenance/tasks/${id}`, { method: 'DELETE' });
    loadData();
  };

  const completeTask = async (id, data) => {
    await authFetch(`${API_BASE}/maintenance/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify(data) });
    setCompleteForm(null);
    loadData();
  };

  // Asset CRUD
  const saveAsset = async (formData) => {
    const url = editAsset ? `${API_BASE}/maintenance/assets/${editAsset.id}` : `${API_BASE}/maintenance/assets`;
    const res = await authFetch(url, { method: editAsset ? 'PUT' : 'POST', body: JSON.stringify(formData) });
    if (res.ok) { setShowAssetForm(false); setEditAsset(null); loadData(); }
  };

  const deleteAsset = async (id) => {
    if (!confirm('Delete this asset?')) return;
    await authFetch(`${API_BASE}/maintenance/assets/${id}`, { method: 'DELETE' });
    loadData();
  };

  if (loading) return <div className="text-warm-gray text-center py-12">Loading...</div>;

  const tasks = taskData?.tasks || [];
  const taskSummary = taskData?.summary || {};
  const assets = assetData?.assets || [];
  const assetSummary = assetData?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-bold">Maintenance</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setEditTask(null); setShowTaskForm(true); setTab('tasks'); }}>+ Task</Button>
          <Button variant="outline" onClick={() => { setEditAsset(null); setShowAssetForm(true); setTab('assets'); }}>+ Asset</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={taskSummary.total_tasks || 0} subtitle={`${taskSummary.pending || 0} pending`} />
        <StatCard label="Overdue" value={taskSummary.overdue || 0} color={taskSummary.overdue > 0 ? 'var(--color-danger)' : undefined} />
        <StatCard label="Total Assets" value={assetSummary.total_assets || 0} subtitle={assetSummary.warranty_expiring_soon > 0 ? `${assetSummary.warranty_expiring_soon} warranties expiring` : ''} />
        <StatCard label="Maintenance Spent" value={fmt(taskSummary.total_spent || 0)} color="var(--color-terracotta)" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-card-border">
        {['tasks', 'assets'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-all border-b-2 ${
              tab === t ? 'border-gold text-gold' : 'border-transparent text-warm-gray hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Task Form */}
      {showTaskForm && tab === 'tasks' && (
        <TaskForm task={editTask} onSave={saveTask} onCancel={() => { setShowTaskForm(false); setEditTask(null); }} />
      )}

      {/* Asset Form */}
      {showAssetForm && tab === 'assets' && (
        <AssetForm asset={editAsset} onSave={saveAsset} onCancel={() => { setShowAssetForm(false); setEditAsset(null); }} />
      )}

      {/* Task completion form */}
      {completeForm && (
        <CompletionForm task={completeForm} onSave={(d) => completeTask(completeForm.id, d)} onCancel={() => setCompleteForm(null)} />
      )}

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        tasks.length === 0 ? (
          <Card><p className="text-warm-gray text-center py-6">No maintenance tasks yet.</p></Card>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const catInfo = TASK_CATEGORIES.find(c => c.value === task.category) || TASK_CATEGORIES[0];
              const priInfo = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1];

              return (
                <Card key={task.id} className={task.overdue ? 'border-l-4 border-l-danger' : ''}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{catInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{task.name}</div>
                      <div className="text-xs text-warm-gray">
                        {task.next_due && `Due: ${fmtDate(task.next_due)}`}
                        {task.frequency && ` \u2022 Every ${task.frequency_value} ${task.frequency}`}
                        {task.total_spent > 0 && ` \u2022 Spent: ${fmt(task.total_spent)}`}
                      </div>
                    </div>
                    <Badge color={priInfo.color}>{priInfo.label}</Badge>
                    {task.overdue && <Badge color="red">Overdue</Badge>}
                    <div className="flex gap-1">
                      <Button variant="sm" className="border border-sage text-sage hover:bg-sage/10" onClick={() => setCompleteForm(task)}>
                        Done
                      </Button>
                      <button onClick={() => { setEditTask(task); setShowTaskForm(true); }} className="text-xs text-warm-gray hover:text-gold px-1">Edit</button>
                      <button onClick={() => deleteTask(task.id)} className="text-xs text-warm-gray hover:text-danger px-1">Del</button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Assets Tab */}
      {tab === 'assets' && (
        assets.length === 0 ? (
          <Card><p className="text-warm-gray text-center py-6">No assets tracked yet.</p></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => {
              const warrantyDays = asset.warranty_expiry
                ? Math.ceil((new Date(asset.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card key={asset.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{asset.name}</h3>
                      <div className="text-xs text-warm-gray mt-0.5">
                        {asset.manufacturer && `${asset.manufacturer} `}
                        {asset.model && asset.model}
                      </div>
                    </div>
                    <Badge color={asset.condition === 'good' ? 'green' : asset.condition === 'fair' ? 'orange' : 'red'}>
                      {asset.condition}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {asset.location && <div><span className="text-warm-gray">Location:</span> {asset.location}</div>}
                    {asset.purchase_price && <div><span className="text-warm-gray">Cost:</span> {fmt(asset.purchase_price)}</div>}
                    {asset.purchase_date && <div><span className="text-warm-gray">Purchased:</span> {fmtDate(asset.purchase_date)}</div>}
                    {warrantyDays !== null && (
                      <div>
                        <span className="text-warm-gray">Warranty:</span>{' '}
                        <span className={warrantyDays <= 0 ? 'text-danger' : warrantyDays <= 90 ? 'text-gold' : ''}>
                          {warrantyDays <= 0 ? 'Expired' : `${warrantyDays}d left`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => { setEditAsset(asset); setShowAssetForm(true); }} className="text-xs text-warm-gray hover:text-gold">Edit</button>
                    <button onClick={() => deleteAsset(asset.id)} className="text-xs text-warm-gray hover:text-danger ml-2">Delete</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: task?.name || '',
    category: task?.category || 'general',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending',
    frequency: task?.frequency || '',
    frequency_value: task?.frequency_value || '',
    next_due: task?.next_due || '',
    estimated_cost: task?.estimated_cost || '',
    assigned_to: task?.assigned_to || '',
    notes: task?.notes || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({
      ...form,
      frequency_value: form.frequency_value ? parseInt(form.frequency_value) : null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      frequency: form.frequency || null,
    });
  };

  return (
    <Card>
      <h3 className="font-serif font-bold mb-4">{task ? 'Edit Task' : 'New Maintenance Task'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Task Name *">
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Change HVAC filter" />
        </Field>
        <Field label="Category">
          <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
            {TASK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input-field" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Repeat Every">
          <div className="flex gap-2">
            <input type="number" className="input-field w-20" value={form.frequency_value} onChange={e => set('frequency_value', e.target.value)} placeholder="#" />
            <select className="input-field flex-1" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              <option value="">One-time</option>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Next Due">
          <input type="date" className="input-field" value={form.next_due} onChange={e => set('next_due', e.target.value)} />
        </Field>
        <Field label="Estimated Cost">
          <input type="number" step="0.01" className="input-field" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} />
        </Field>
        <Field label="Notes" className="md:col-span-2 lg:col-span-3">
          <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
        <div className="flex gap-3 md:col-span-2 lg:col-span-3">
          <Button type="submit">{task ? 'Update' : 'Add Task'}</Button>
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function AssetForm({ asset, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: asset?.name || '',
    category: asset?.category || 'appliance',
    location: asset?.location || '',
    manufacturer: asset?.manufacturer || '',
    model: asset?.model || '',
    serial_number: asset?.serial_number || '',
    purchase_date: asset?.purchase_date || '',
    purchase_price: asset?.purchase_price || '',
    warranty_expiry: asset?.warranty_expiry || '',
    condition: asset?.condition || 'good',
    notes: asset?.notes || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({ ...form, purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null });
  };

  return (
    <Card>
      <h3 className="font-serif font-bold mb-4">{asset ? 'Edit Asset' : 'New Asset'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Name *">
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dishwasher" />
        </Field>
        <Field label="Category">
          <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
            {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <input className="input-field" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Kitchen" />
        </Field>
        <Field label="Manufacturer">
          <input className="input-field" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
        </Field>
        <Field label="Model">
          <input className="input-field" value={form.model} onChange={e => set('model', e.target.value)} />
        </Field>
        <Field label="Serial Number">
          <input className="input-field" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
        </Field>
        <Field label="Purchase Date">
          <input type="date" className="input-field" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
        </Field>
        <Field label="Purchase Price">
          <input type="number" step="0.01" className="input-field" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
        </Field>
        <Field label="Warranty Expiry">
          <input type="date" className="input-field" value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} />
        </Field>
        <Field label="Condition">
          <select className="input-field" value={form.condition} onChange={e => set('condition', e.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </Field>
        <Field label="Notes" className="md:col-span-2 lg:col-span-3">
          <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
        <div className="flex gap-3 md:col-span-2 lg:col-span-3">
          <Button type="submit">{asset ? 'Update' : 'Add Asset'}</Button>
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function CompletionForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState({ cost: '', vendor: '', notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ cost: form.cost ? parseFloat(form.cost) : 0, vendor: form.vendor, notes: form.notes });
  };

  return (
    <Card accent="var(--color-sage)">
      <h3 className="font-serif font-bold mb-3">Complete: {task.name}</h3>
      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <Field label="Cost">
          <input type="number" step="0.01" className="input-field w-28" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
        </Field>
        <Field label="Vendor">
          <input className="input-field w-40" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
        </Field>
        <Field label="Notes">
          <input className="input-field w-48" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Button type="submit">Mark Complete</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </form>
    </Card>
  );
}
