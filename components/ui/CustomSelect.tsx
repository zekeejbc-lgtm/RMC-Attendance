import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronDown, Search, X } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multi?: boolean;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  combobox?: boolean;
  ariaLabel?: string;
}

const selectAllKey = '__select_all__';

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multi = false,
  searchable = false,
  className = '',
  disabled = false,
  combobox = false,
  ariaLabel,
}) => {
  const labelId = useId();
  const valueId = useId();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  const filteredOptions = useMemo(() => options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())), [options, search]);
  const optionKeys = useMemo(
    () => [...(multi ? [selectAllKey] : []), ...filteredOptions.map((option) => option.value)],
    [filteredOptions, multi],
  );

  const selectedKey = multi
    ? selectAllKey
    : typeof value === 'string' && options.some((option) => option.value === value)
      ? value
      : null;

  const focusOption = (key: string | undefined) => {
    if (!key) return;
    setActiveKey(key);
    const option = optionRefs.current.get(key);
    if (option) option.focus();
  };

  useLayoutEffect(() => {
    if (isOpen && activeKey) optionRefs.current.get(activeKey)?.focus();
  }, [activeKey, isOpen]);

  const openListbox = (preferredKey?: string) => {
    const nextKey = preferredKey && optionKeys.includes(preferredKey)
      ? preferredKey
      : selectedKey && optionKeys.includes(selectedKey)
        ? selectedKey
        : optionKeys[0];
    setIsOpen(true);
    focusOption(nextKey);
  };

  const closeListbox = (restoreFocus = false) => {
    setIsOpen(false);
    setSearch('');
    setActiveKey(null);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeListbox();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || optionKeys.length === 0 || (activeKey && optionKeys.includes(activeKey))) return;
    setActiveKey(optionKeys[0]);
  }, [activeKey, isOpen, optionKeys]);

  const handleSelect = (optionValue: string) => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.includes(optionValue)
        ? currentValues.filter((currentValue) => currentValue !== optionValue)
        : [...currentValues, optionValue]);
      return;
    }

    onChange(optionValue);
    closeListbox(true);
  };

  const handleSelectAll = () => {
    if (Array.isArray(value) && value.length === options.length) onChange([]);
    else onChange(options.map((option) => option.value));
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeListbox(true);
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (optionKeys.length === 0) return;

    const currentIndex = Math.max(0, optionKeys.indexOf(activeKey || optionKeys[0]));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? optionKeys.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % optionKeys.length
          : (currentIndex - 1 + optionKeys.length) % optionKeys.length;
    focusOption(optionKeys[nextIndex]);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeListbox(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(event.key === 'ArrowDown' ? optionKeys[0] : optionKeys.at(-1));
    }
  };

  const getDisplayValue = () => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.length === 0) return placeholder;
      if (currentValues.length === options.length && options.length > 0) return 'All Selected';
      if (currentValues.length === 1) {
        return options.find((option) => option.value === currentValues[0])?.label || placeholder;
      }
      return `${currentValues.length} Selected`;
    }

    const selected = options.find((option) => option.value === value);
    return selected ? selected.label : placeholder;
  };

  const searchName = label ? `Search ${label} options` : 'Search selection options';

  return (
    <div
      className={`relative space-y-1.5 ${className}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (isOpen && (!nextTarget || !event.currentTarget.contains(nextTarget))) {
          closeListbox();
        }
      }}
      ref={containerRef}
    >
      {label ? (
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400" id={labelId}>
          {label}
        </span>
      ) : null}

      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : label ? `${labelId} ${valueId}` : valueId}
        className={`group flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border bg-slate-50 px-3.5 py-2.5 text-left text-sm font-bold text-brand-900 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 ${isOpen ? 'border-gold-400 bg-white ring-4 ring-gold-400/10 dark:bg-slate-900' : 'border-slate-200 hover:border-gold-400 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900'}`}
        disabled={disabled}
        role={combobox ? 'combobox' : undefined}
        value={typeof value === 'string' ? value : undefined}
        onClick={() => isOpen ? closeListbox() : openListbox()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openListbox(event.key === 'ArrowUp' ? optionKeys.at(-1) : undefined);
          } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeListbox(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="min-w-0 flex-1 select-none truncate" id={valueId}>{getDisplayValue()}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isOpen ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300' : 'bg-slate-100 text-slate-400 group-hover:text-brand-900 dark:bg-slate-700 dark:text-slate-300'}`}>
          <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={15} strokeWidth={2.5} />
        </span>
      </button>

      {isOpen ? (
        <div className="app-dropdown-menu absolute left-0 right-0 top-full z-50 mt-2 origin-top overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/95">
          {searchable || options.length > 10 ? (
            <div className="border-b border-slate-100 p-2 dark:border-slate-700">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                <Search className="text-slate-400 dark:text-slate-500" size={14} />
                <input
                  aria-controls={listboxId}
                  aria-label={searchName}
                  className="w-full bg-transparent text-xs font-bold text-brand-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  onChange={(event) => setSearch(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search..."
                  type="text"
                  value={search}
                />
                {search ? (
                  <button
                    aria-label={`Clear ${label || 'selection'} options search`}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    onClick={(event) => { event.stopPropagation(); setSearch(''); }}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            aria-label={label ? `${label} options` : 'Selection options'}
            aria-multiselectable={multi || undefined}
            className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar"
            id={listboxId}
            role="listbox"
          >
            {multi ? (
              <button
                aria-label="Select all"
                aria-selected={Array.isArray(value) && value.length === options.length && options.length > 0}
                className={`app-dropdown-option mb-1 flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${Array.isArray(value) && value.length === options.length && options.length > 0 ? 'bg-gold-50 text-brand-900 dark:bg-gold-950/60 dark:text-gold-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/60'}`}
                onClick={handleSelectAll}
                onFocus={() => setActiveKey(selectAllKey)}
                onKeyDown={handleOptionKeyDown}
                ref={(element) => { if (element) optionRefs.current.set(selectAllKey, element); else optionRefs.current.delete(selectAllKey); }}
                role="option"
                tabIndex={activeKey === selectAllKey ? 0 : -1}
                type="button"
              >
                <span>All</span>
                {Array.isArray(value) && value.length === options.length && options.length > 0 ? <CheckCircle className="text-gold-500" size={14} /> : null}
              </button>
            ) : null}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500" role="status">
                No options found
              </div>
            ) : filteredOptions.map((option, optionIndex) => {
              const isSelected = multi
                ? Array.isArray(value) && value.includes(option.value)
                : value === option.value;

              return (
                <button
                  aria-selected={isSelected}
                  className={`app-dropdown-option mb-1 flex min-h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${isSelected ? 'bg-brand-50 text-brand-900 dark:bg-slate-700 dark:text-gold-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50'}`}
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  onFocus={() => setActiveKey(option.value)}
                  onKeyDown={handleOptionKeyDown}
                  ref={(element) => { if (element) optionRefs.current.set(option.value, element); else optionRefs.current.delete(option.value); }}
                  role="option"
                  style={{ '--option-index': optionIndex + (multi ? 1 : 0) } as React.CSSProperties}
                  tabIndex={activeKey === option.value ? 0 : -1}
                  type="button"
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? <CheckCircle className="text-brand-900 dark:text-gold-400" size={14} /> : null}
                </button>
              );
            })}
          </div>

          {multi ? (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {Array.isArray(value) ? value.length : 0} selected
              </span>
              <button className="text-[9px] font-black uppercase tracking-widest text-brand-900 transition-colors hover:text-gold-500 dark:text-gold-400" onClick={() => closeListbox(true)} type="button">
                Done
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CustomSelect;
