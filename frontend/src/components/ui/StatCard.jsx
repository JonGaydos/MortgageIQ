import Card from './Card';

export default function StatCard({ label, value, subtitle, color }) {
  return (
    <Card accent={color}>
      <div className="text-xs font-semibold uppercase tracking-wide text-warm-gray mb-1">
        {label}
      </div>
      <div className="text-2xl font-serif font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-warm-gray mt-1">{subtitle}</div>
      )}
    </Card>
  );
}
