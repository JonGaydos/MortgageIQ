export default function Card({ children, className = '', accent, ...props }) {
  return (
    <div
      className={`card ${className}`}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
