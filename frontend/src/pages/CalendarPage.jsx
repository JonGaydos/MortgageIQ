import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { API_BASE } from '../utils/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Field from '../components/ui/Field';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadEvents = async () => {
    setLoading(true);
    const res = await authFetch(`${API_BASE}/calendar?month=${monthKey}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, [monthKey]);

  const goMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setCurrentDate(d);
    setSelectedDay(null);
  };

  const saveEvent = async (formData) => {
    const res = await authFetch(`${API_BASE}/calendar`, {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (res.ok) { setShowForm(false); loadEvents(); }
  };

  const deleteEvent = async (id) => {
    // Only custom events can be deleted
    const numId = id.replace('cal_', '');
    await authFetch(`${API_BASE}/calendar/${numId}`, { method: 'DELETE' });
    loadEvents();
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let week = new Array(firstDay).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const today = new Date();
  const isToday = (day) => day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-bold">Calendar</h1>
        <Button onClick={() => setShowForm(true)}>+ Add Event</Button>
      </div>

      {/* New event form */}
      {showForm && (
        <Card>
          <EventForm
            defaultDate={selectedDay ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : ''}
            onSave={saveEvent}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {/* Calendar header */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <button onClick={() => goMonth(-1)} className="px-3 py-1 text-warm-gray hover:text-foreground text-lg">&larr;</button>
          <h2 className="font-serif text-lg font-bold">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={() => goMonth(1)} className="px-3 py-1 text-warm-gray hover:text-foreground text-lg">&rarr;</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-warm-gray py-2 border-b border-card-border">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="text-center text-warm-gray py-12">Loading...</div>
        ) : (
          <div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const selected = day === selectedDay;

                  return (
                    <div
                      key={di}
                      onClick={() => day && setSelectedDay(selected ? null : day)}
                      className={`
                        min-h-[80px] p-1.5 border-b border-r border-card-border cursor-pointer transition-colors
                        ${!day ? 'bg-cream/20' : 'hover:bg-cream/40'}
                        ${selected ? 'bg-gold/10 ring-1 ring-gold' : ''}
                        ${isToday(day) ? 'bg-gold/5' : ''}
                      `}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-semibold mb-1 ${isToday(day) ? 'text-gold' : 'text-warm-gray'}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(ev => (
                              <div
                                key={ev.id}
                                className="text-[10px] leading-tight truncate rounded px-1 py-0.5"
                                style={{ backgroundColor: ev.color ? `${ev.color}20` : '#d4a84320', color: ev.color || '#d4a843' }}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-warm-gray">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <h3 className="font-serif font-bold mb-3">
            {MONTH_NAMES[month]} {selectedDay}, {year}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-warm-gray text-sm">No events this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream/30">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || '#d4a843' }} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{ev.title}</div>
                    <div className="text-xs text-warm-gray">
                      {ev.type !== 'custom' && <Badge color={ev.type === 'bill' ? (ev.paid ? 'green' : 'red') : 'gray'}>{ev.type}</Badge>}
                      {ev.amount && ` ${fmt(ev.amount)}`}
                      {ev.notes && ` \u2022 ${ev.notes}`}
                    </div>
                  </div>
                  {ev.id.startsWith('cal_') && (
                    <button onClick={() => deleteEvent(ev.id)} className="text-xs text-warm-gray hover:text-danger">Del</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function EventForm({ defaultDate, onSave, onCancel }) {
  const [form, setForm] = useState({ title: '', event_date: defaultDate || '', color: '', notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.event_date) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-serif font-bold">New Event</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Title *">
          <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
        </Field>
        <Field label="Date *">
          <input type="date" className="input-field" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
        </Field>
        <Field label="Notes">
          <input className="input-field" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Button type="submit">Add Event</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
