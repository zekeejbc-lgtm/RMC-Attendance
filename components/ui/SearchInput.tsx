import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const SearchInput = ({ ariaLabel, value, onChange, placeholder = 'Search...', label, className = '', disabled = false }: SearchInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      {label ? <span className="app-field-label block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span> : null}
      <div className="group relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-gold-600 dark:text-slate-500 dark:group-focus-within:text-gold-400" size={17} strokeWidth={2.25} />
        <input aria-label={ariaLabel} className="app-search-input" disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} ref={inputRef} type="search" value={value} />
        {value && !disabled ? (
          <button aria-label={`Clear ${ariaLabel.toLowerCase()}`} className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 dark:hover:bg-slate-700 dark:hover:text-white" onClick={() => { onChange(''); inputRef.current?.focus(); }} type="button">
            <X aria-hidden="true" size={14} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SearchInput;
