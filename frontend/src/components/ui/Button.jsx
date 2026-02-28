const variants = {
  primary: 'btn-primary',
  outline: 'px-4 py-2 rounded-lg font-semibold text-sm border border-gold text-gold hover:bg-gold/10 transition-all duration-150',
  ghost: 'px-4 py-2 rounded-lg font-semibold text-sm text-warm-gray hover:bg-warm-gray/10 transition-all duration-150',
  danger: 'px-4 py-2 rounded-lg font-semibold text-sm bg-danger text-white hover:brightness-110 transition-all duration-150',
  sm: 'px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-150',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`${variants[variant] || variants.primary} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
}
