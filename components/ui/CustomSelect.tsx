
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, CheckCircle, X } from 'lucide-react';

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
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multi = false,
  searchable = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (optValue: string) => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(optValue)) {
        onChange(currentValues.filter(v => v !== optValue));
      } else {
        onChange([...currentValues, optValue]);
      }
    } else {
      onChange(optValue);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (Array.isArray(value) && value.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const getDisplayValue = () => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.length === 0) return placeholder;
      if (currentValues.length === options.length && options.length > 0) return 'All Selected';
      if (currentValues.length === 1) return options.find(o => o.value === currentValues[0])?.label || placeholder;
      return `${currentValues.length} Selected`;
    } else {
      const selected = options.find(o => o.value === value);
      return selected ? selected.label : placeholder;
    }
  };

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      )}
      
      <div 
        className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 cursor-pointer flex justify-between items-center transition-all ${isOpen ? 'border-gold-400 ring-1 ring-gold-400/20' : 'border-slate-200 dark:border-slate-700 hover:border-gold-400'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate select-none">{getDisplayValue()}</span>
        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top">
          {(searchable || options.length > 10) && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg">
                <Search size={14} className="text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent text-xs font-bold text-brand-900 dark:text-slate-100 outline-none w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {search && (
                  <button onClick={(e) => { e.stopPropagation(); setSearch(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
            {multi && (
              <button 
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 flex items-center justify-between transition-colors ${
                  Array.isArray(value) && value.length === options.length && options.length > 0
                  ? 'bg-gold-50 dark:bg-gold-950/60 text-brand-900 dark:text-gold-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
                onClick={handleSelectAll}
              >
                <span>Select All</span>
                {Array.isArray(value) && value.length === options.length && options.length > 0 && <CheckCircle size={14} className="text-gold-500" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                No options found
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = multi 
                  ? (Array.isArray(value) && value.includes(opt.value))
                  : value === opt.value;

                return (
                  <button 
                    key={opt.value}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold mb-1 flex items-center justify-between transition-colors ${
                      isSelected 
                      ? 'bg-brand-50 dark:bg-slate-700 text-brand-900 dark:text-gold-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <CheckCircle size={14} className="text-brand-900 dark:text-gold-400" />}
                  </button>
                );
              })
            )}
          </div>
          
          {multi && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {Array.isArray(value) ? value.length : 0} selected
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-black text-brand-900 dark:text-gold-400 uppercase tracking-widest hover:text-gold-500 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
