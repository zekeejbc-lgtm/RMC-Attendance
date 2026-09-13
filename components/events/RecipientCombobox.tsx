import React, { useId, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';

interface RecipientComboboxProps {
  options: string[];
  selected: string[];
  onChange: (recipients: string[]) => void;
}

const uniqueRecipients = (recipients: string[]) => recipients.reduce<string[]>((result, recipient) => {
  const normalized = recipient.trim();
  if (!normalized || result.some((item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase())) return result;
  return [...result, normalized];
}, []);

export const RecipientCombobox: React.FC<RecipientComboboxProps> = ({ options, selected, onChange }) => {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return options.filter((option) => !selected.includes(option)).slice(0, 8);
    return options.filter((option) => (
      option.toLocaleLowerCase().includes(needle)
      && !selected.some((item) => item.toLocaleLowerCase() === option.toLocaleLowerCase())
    )).slice(0, 8);
  }, [options, query, selected]);

  const addRecipients = (values: string[]) => {
    const additions = uniqueRecipients(values);
    if (!additions.length) return;
    const base = additions.some((item) => item !== 'All Students')
      ? selected.filter((item) => item !== 'All Students')
      : [];
    onChange(uniqueRecipients([...base, ...additions]));
  };

  const selectSuggestion = (value: string) => {
    addRecipients([value]);
    setQuery('');
    setOpen(false);
  };

  const handleInput = (value: string) => {
    if (!value.includes(',')) {
      setQuery(value);
      setOpen(true);
      return;
    }

    const parts = value.split(',');
    const remainder = parts.pop() || '';
    addRecipients(parts);
    setQuery(remainder.replace(/^\s+/, ''));
    setOpen(Boolean(remainder.trim()));
  };

  const removeRecipient = (recipient: string) => {
    onChange(selected.filter((item) => item !== recipient));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor="event-recipient-search" className="app-field-label">Search and add event recipients</label>
        <div className="relative mt-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} strokeWidth={2.25} />
          <input
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open && suggestions.length > 0}
            className="app-search-input"
            id="event-recipient-search"
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => handleInput(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                selectSuggestion(suggestions[0] || query);
              } else if (event.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder="Search a school group or type names separated by commas"
            role="combobox"
            type="search"
            value={query}
          />
        </div>

        {open && suggestions.length > 0 ? (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800" id={listboxId} role="listbox" aria-label="Recipient suggestions">
            {suggestions.map((suggestion) => (
              <button
                className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-gold-50 hover:text-brand-900 dark:text-slate-200 dark:hover:bg-slate-700"
                key={suggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                role="option"
                type="button"
              >
                <span>{suggestion}</span><Check aria-hidden="true" className="text-gold-500" size={16} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div aria-label="Added event recipients" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70" role="status">
        <div className="flex flex-wrap gap-2">
          {selected.map((recipient) => (
            <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-bold text-brand-900 dark:border-gold-800 dark:bg-gold-950/40 dark:text-gold-200" key={recipient}>
              {recipient}
              <button aria-label={`Remove ${recipient}`} className="rounded-full p-0.5 hover:bg-gold-100 dark:hover:bg-gold-900" onClick={() => removeRecipient(recipient)} type="button"><X size={13} /></button>
            </span>
          ))}
          {!selected.length ? <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">No recipients added yet.</span> : null}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {selected.length} {selected.length === 1 ? 'recipient' : 'recipients'} added{selected.length ? `: ${selected.join(', ')}` : ''}
        </p>
      </div>
    </div>
  );
};
