export default function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-warm-gray mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
