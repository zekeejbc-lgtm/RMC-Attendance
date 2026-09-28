import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

/** Shared presence and motion for selects and search suggestions. */
export function DropdownPanel({ open, children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { open: boolean }) {
  const [present, setPresent] = useState(open);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setPresent(true); return; }
    if (!present) return;
    // Read the actual token-backed CSS duration, including reduced-motion overrides.
    const style = panel.current ? getComputedStyle(panel.current) : null;
    const milliseconds = (value: string) => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000) || 0;
    const duration = Math.max(0, ...(style?.transitionDuration.split(',').map(milliseconds) || [0]));
    const timer = window.setTimeout(() => setPresent(false), duration);
    return () => window.clearTimeout(timer);
  }, [open, present]);

  if (!open && !present) return null;
  return <div {...props} ref={panel} aria-hidden={open ? undefined : true} inert={open ? undefined : true}
    data-state={open ? 'open' : 'closed'} className={`app-dropdown-menu ${className}`}>
    {children}
  </div>;
}
