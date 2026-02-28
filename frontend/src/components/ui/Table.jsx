export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return <thead>{children}</thead>;
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, className = '', ...props }) {
  return (
    <tr className={`border-b border-card-border transition-colors hover:bg-cream/50 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-warm-gray ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-3 py-2.5 ${className}`}>
      {children}
    </td>
  );
}
