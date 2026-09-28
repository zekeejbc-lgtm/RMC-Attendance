// One-off migration; run from the project root.
const fs = require('node:fs');
const path = require('node:path');
function edit(file, fn) { const before = fs.readFileSync(file, 'utf8'); const after = fn(before); if (after !== before) fs.writeFileSync(file, after); }
edit('index.css', css => {
  css = css.replace('  --radius-control:', `  --color-on-brand: #FFFFFF;
  --color-focus: var(--color-accent-strong);
  --color-control: var(--color-surface-muted);
  --color-control-hover: var(--color-surface);
  --color-selected: var(--color-brand-soft);
  --color-selected-text: var(--color-brand-strong);
  --color-danger-text: var(--color-danger);
  --color-warning-text: var(--color-warning);
  --control-height-sm: 2rem;
  --control-height: 2.75rem;
  --control-height-lg: 3rem;
  --control-font-size: 0.875rem;
  --control-padding-x: 0.875rem;
  --control-padding-y: 0.625rem;
  --disabled-opacity: 0.6;
  --shadow-control: 0 1px 2px rgb(15 23 42 / 0.05);
  --shadow-dropdown: 0 18px 45px -12px rgb(14 27 66 / 0.28), 0 4px 12px rgb(14 27 66 / 0.08);
  --shadow-focus: 0 0 0 3px color-mix(in srgb, var(--color-focus) 25%, transparent);
  --radius-control:`);
  css = css.replace('.dark {', `.dark {
  --color-control: var(--color-surface);
  --color-control-hover: var(--color-surface-muted);
  --color-selected: #193b55;
  --color-selected-text: #bae6fd;
  --color-danger-text: #FDA4AF;
  --color-warning-text: #FCD34D;`);
  css = css.replace('outline: 3px solid rgba(255, 140, 0, 0.48);', 'outline: 3px solid color-mix(in srgb, var(--color-focus) 65%, transparent);');
  css = css.replace('border-radius: 1rem;\n  background-color: var(--surface-card)', 'border-radius: var(--radius-surface);\n  background-color: var(--surface-card)');
  css = css.replace('background-color 0.25s ease, color 0.25s ease', 'background-color var(--motion-base) var(--motion-standard), color var(--motion-base) var(--motion-standard)');
  css = css.replace('modalEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1)', 'modalEnter var(--motion-base) var(--motion-standard)').replace('fadeIn 0.2s ease-out', 'fadeIn var(--motion-fast) var(--motion-standard)').replace('slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 'slideUp var(--motion-base) var(--motion-standard)');
  const start = css.indexOf('.app-dropdown-menu {');
  const end = css.indexOf('.app-disclosure-chevron {', start);
  css = css.slice(0,start) + `.app-dropdown-menu {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-dropdown);
  transform-origin: top;
  animation: dropdownEnter var(--motion-base) var(--motion-standard) both;
  transition: opacity var(--motion-fast) var(--motion-standard), transform var(--motion-fast) var(--motion-standard);
}
.app-dropdown-menu[data-state='closed'] {
  animation: none;
  opacity: 0;
  transform: translateY(-8px) scale(0.975);
  pointer-events: none;
}
.app-dropdown-option {
  min-height: var(--control-height);
  width: 100%;
  border-radius: var(--radius-control);
  padding: var(--control-padding-y) var(--control-padding-x);
  color: var(--color-text-muted);
  font-size: var(--control-font-size);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--motion-snappy), color var(--motion-fast) var(--motion-snappy);
}
.app-dropdown-option:hover, .app-dropdown-option:focus-visible, .app-dropdown-option[aria-selected='true'] {
  background: var(--color-selected);
  color: var(--color-selected-text);
}
.app-dropdown-meta { color: var(--color-text-muted); font-size: 0.75rem; }
.app-collapsible {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition: grid-template-rows var(--motion-base) var(--motion-standard), opacity var(--motion-base) var(--motion-standard), visibility var(--motion-base) step-end;
}
.app-collapsible[data-state='open'] {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
  transition-timing-function: var(--motion-standard), var(--motion-standard), step-start;
}
.app-collapsible__inner { min-height: 0; overflow: hidden; }
.app-disclosure-trigger { border-radius: var(--radius-control); color: var(--color-text); }
.app-disclosure-trigger:hover { background: var(--color-control); }

` + css.slice(end);
  css = css.replaceAll('var(--motion-fast) ease', 'var(--motion-fast) var(--motion-snappy)');
  const formStart = css.indexOf('.app-search-input {');
  const formEnd = css.indexOf('.leaflet-container {', formStart);
  css = css.slice(0,formStart) + `/* Shared by legacy form fields, search, and custom select triggers. */
.input-field, .app-search-input, .app-select-trigger, .app-control {
  width: 100%;
  min-height: var(--control-height);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background-color: var(--color-control);
  padding: var(--control-padding-y) var(--control-padding-x);
  color: var(--color-text);
  font-size: var(--control-font-size);
  font-weight: 600;
  box-shadow: var(--shadow-control);
  transition: background-color var(--motion-fast) var(--motion-snappy), border-color var(--motion-fast) var(--motion-snappy), box-shadow var(--motion-fast) var(--motion-snappy);
}
:is(.input-field, .app-search-input, .app-select-trigger, .app-control):hover:not(:disabled) {
  border-color: var(--color-focus);
  background-color: var(--color-control-hover);
}
:is(.input-field, .app-search-input, .app-select-trigger, .app-control):is(:focus-visible, [aria-expanded='true']) {
  border-color: var(--color-focus);
  background-color: var(--color-control-hover);
  box-shadow: var(--shadow-focus);
  outline: none;
}
:is(.input-field, .app-search-input, .app-control)::placeholder { color: var(--color-text-subtle); font-weight: 500; }
:is(.input-field, .app-search-input, .app-select-trigger, .app-control):disabled { cursor: not-allowed; opacity: var(--disabled-opacity); }
.app-search-input { appearance: none; padding-inline: 2.5rem 2.75rem; }
.app-search-input::-webkit-search-cancel-button { display: none; }
.app-field-label { display: block; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.025em; }
.app-button { border: 1px solid transparent; border-radius: var(--radius-control); gap: 0.375rem; box-shadow: var(--shadow-control); transition: background-color var(--motion-fast) var(--motion-snappy), border-color var(--motion-fast) var(--motion-snappy), color var(--motion-fast) var(--motion-snappy), transform var(--motion-fast) var(--motion-snappy), filter var(--motion-fast) var(--motion-snappy); }
.app-button--sm { min-height: var(--control-height-sm); }
.app-button--md { min-height: var(--control-height); }
.app-button--lg { min-height: var(--control-height-lg); }
.app-button--primary { background: var(--color-brand-strong); color: var(--color-on-brand); }
.app-button--primary:hover:not(:disabled) { background: var(--color-brand); }
.app-button--secondary { border-color: var(--color-border); background: var(--color-surface); color: var(--color-text); }
.app-button--secondary:hover:not(:disabled) { border-color: var(--color-brand); background: var(--color-selected); color: var(--color-selected-text); }
.app-button--gold { background: linear-gradient(135deg, var(--color-accent), var(--color-accent-strong)); color: var(--color-brand-strong); }
.app-button--gold:hover:not(:disabled) { filter: brightness(1.05); }
.app-button--danger { --button-tone: var(--color-danger-text); }
.app-button--warning { --button-tone: var(--color-warning-text); }
.app-button--danger, .app-button--warning { color: var(--button-tone); border-color: color-mix(in srgb, var(--button-tone) 45%, var(--color-border)); background: color-mix(in srgb, var(--button-tone) 7%, var(--color-surface)); }
:is(.app-button--danger, .app-button--warning):hover:not(:disabled) { background: color-mix(in srgb, var(--button-tone) 15%, var(--color-surface)); }
.app-button:active:not(:disabled) { transform: translateY(1px); }
.app-button:disabled { opacity: var(--disabled-opacity); cursor: not-allowed; }
.app-icon-button { border-radius: var(--radius-control); color: var(--color-text-muted); }
.app-icon-button:hover:not(:disabled) { background: var(--color-selected); color: var(--color-selected-text); }

` + css.slice(formEnd);
  const selectStart = css.indexOf('/* Custom Dropdown Styling */');
  const selectEnd = css.indexOf('/* --- BADGES',selectStart);
  css = css.slice(0,selectStart) + `/* Native controls retain platform keyboard/validation behavior. */
select.input-field, select.app-control, .select-field {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.875rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
}
select option { background: var(--color-surface); color: var(--color-text); }
input:is([type='checkbox'], [type='radio'], [type='range']) { accent-color: var(--color-brand); }

` + css.slice(selectEnd);
  return css;
});
// Normalize duration utilities while keeping each component's transition properties.
for (const root of ['components','views']) for (const file of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.tsx')&&!f.endsWith('.test.tsx'))) {
  edit(path.join(root,file), text => text.replace(/duration-(?:150|200)\b/g,'duration-fast').replace(/duration-(?:300|500|700)\b/g,'duration-base').replace(/ease-in-out\b/g,'ease-standard'));
}
edit('tailwind.config.cjs', text => text.replace('      fontFamily:', `      transitionDuration: { DEFAULT: 'var(--motion-fast)', fast: 'var(--motion-fast)', base: 'var(--motion-base)' },
      transitionTimingFunction: { DEFAULT: 'var(--motion-snappy)', standard: 'var(--motion-standard)' },
      fontFamily:`));
