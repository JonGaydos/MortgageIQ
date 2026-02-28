const colorMap = {
  green: 'bg-success/15 text-success',
  orange: 'bg-gold/15 text-gold',
  red: 'bg-danger/15 text-danger',
  blue: 'bg-blue-500/15 text-blue-500',
  gray: 'bg-warm-gray/15 text-warm-gray',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color] || colorMap.gray} ${className}`}>
      {children}
    </span>
  );
}
