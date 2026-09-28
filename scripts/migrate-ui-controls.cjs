const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function edit(file,fn) { const s=fs.readFileSync(file,'utf8'); fs.writeFileSync(file,fn(s)); }
edit('components/ui/CustomSelect.tsx', s => {
  const start=s.indexOf('            <div className="border-b',s.indexOf('<DropdownPanel'));
  const end=s.indexOf('          ) : null}',start);
  s=s.slice(0,start)+`            <div className="border-b border-[var(--color-border)] p-2">
              <SearchInput ariaLabel={searchName} controls={listboxId} type="text" value={search} onChange={setSearch} onKeyDown={handleSearchKeyDown} />
            </div>
`+s.slice(end);
  s=s.replace(/className=\{`app-dropdown-option[^\n]+/g,'className="app-dropdown-option mb-1 flex items-center justify-between gap-2 font-semibold"');
  s=s.replace('filteredOptions.map((option, optionIndex)', 'filteredOptions.map((option)').replace(/\s+style=\{\{ '--option-index':[^\n]+/g,'');
  return s.replaceAll('className="text-brand-900 dark:text-gold-400"','className="text-current"');
});
edit('components/ui/SearchSuggest.tsx', s => s.replace("import { Search, X } from 'lucide-react';", "import { Search, X } from 'lucide-react';\nimport { DropdownPanel } from './DropdownPanel';")
  .replace('{expanded && <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-900">','<DropdownPanel open={expanded} className="absolute z-50 mt-2 w-full p-1">')
  .replace('className="max-h-72 overflow-auto"','className="custom-scrollbar max-h-72 overflow-auto"')
  .replace(/className=\{`cursor-pointer rounded-lg[^`]+`\}/,'className="app-dropdown-option"')
  .replace('className="mt-1 block break-words text-xs text-slate-500 dark:text-slate-300"','className="app-dropdown-meta mt-1 block break-words"')
  .replace('className="px-3 py-2 text-xs text-slate-500"','className="app-dropdown-meta px-3 py-2"')
  .replace('className="absolute right-0 top-0','className="app-icon-button absolute right-0 top-0')
  .replace('    </div>}\n  </div>;', '    </DropdownPanel>\n  </div>;'));
edit('components/events/RecipientCombobox.tsx', s => s.replace("import { Check, Search, X } from 'lucide-react';", "import { Check, Search, X } from 'lucide-react';\nimport { DropdownPanel } from '../ui/DropdownPanel';")
  .replace('{open && suggestions.length > 0 ? (\n          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"', '<DropdownPanel open={open && suggestions.length > 0} className="absolute z-50 mt-2 w-full overflow-hidden p-1"')
  .replace(/className="flex min-h-11 w-full items-center justify-between rounded-xl[^\n]+/,'className="app-dropdown-option flex items-center justify-between gap-2 font-semibold"')
  .replace('          </div>\n        ) : null}', '          </DropdownPanel>'));
edit('components/academic/NodeOfficerManager.tsx', s=>s.replace("import ", "import { Collapsible } from '../ui/Collapsible';\nimport ")
  .replace(/className=\{`shrink-0 transition-transform duration-base[^`]+`\}/,'className="app-disclosure-chevron shrink-0"')
  .replace(/<div id=\{`enrollment-key-panel-\$\{node.id\}`\} className=\{`grid transition-\[grid-template-rows,opacity\][^`]+`\}>\s*<div className="min-h-0 overflow-hidden">\s*<div className="([^"]+)">/, '<Collapsible id={`enrollment-key-panel-${node.id}`} open={enrollmentKeyOpen} innerClassName="$1">')
  .replace('            </div>\n          </div>\n        </div>\n      </div>}', '        </Collapsible>\n      </div>}'));
edit('components/events/CeremonyExemptionFilters.tsx', s=>s.replace("import { useState }", "import { useId, useState }")
  .replace("import Button from '../ui/Button';", "import Button from '../ui/Button';\nimport { Collapsible } from '../ui/Collapsible';\nimport { Disclosure } from '../ui/Disclosure';")
  .replace('  const [open,setOpen]', '  const panelId = useId();\n  const [open,setOpen]')
  .replace('aria-expanded={open}', 'aria-expanded={open} aria-controls={panelId}')
  .replace('{open && <div className="space-y-4">','<Collapsible open={open} id={panelId} innerClassName="space-y-4">')
  .replace('    </div>}\n    {!editing', '    </Collapsible>\n    {!editing')
  .replace(/<details key=\{(row.date|day)\} className="rounded-lg border p-3"><summary>(.*?)<\/summary>/g, '<Disclosure key={$1} title={<>$2</>}>')
  .replaceAll('</details>', '</Disclosure>'));
edit('views/SSGEventCreation.tsx', s=>s.replace('<ChevronDown/></button><Collapsible','<ChevronDown className="app-disclosure-chevron"/></button><Collapsible'));
// Use syntax positions to change only native form controls, leaving existing edits intact.
for(const root of ['components','views']) for(const relative of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.tsx')&&!f.endsWith('.test.tsx'))) {
  const file=path.join(root,relative);
  if(file.includes('components\\ui\\')||file.includes('components/ui/')) continue;
  let s=fs.readFileSync(file,'utf8');
  const source=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const edits=[];let hasSelect=false;
  function visit(node) {
    if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='select') {
      hasSelect=true;
      const open=node.openingElement, attrs=open.attributes.properties;
      edits.push([open.tagName.getStart(source),open.tagName.end,'SelectField'],[node.closingElement.tagName.getStart(source),node.closingElement.tagName.end,'SelectField']);
      let named=false;
      for(const attr of attrs) {
        if(!ts.isJsxAttribute(attr))continue;
        const name=attr.name.getText(source);
        if(name==='aria-label') named=true;
        if(name==='className') edits.push([attr.getStart(source),attr.end,'className="mt-1 min-w-0"']);
        if(name==='onChange') {
          const expr=attr.initializer.expression;
          const param=expr.parameters[0].name.getText(source);
          edits.push([expr.getStart(source),expr.end,expr.getText(source).replaceAll(`${param}.target.value`,param)]);
        }
      }
      if(!named) {
        let label='Choose an option';
        const parent=node.parent;
        if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(source)==='label') label=parent.children.filter(ts.isJsxText).map(c=>c.text.trim()).filter(Boolean).join(' ');
        else if(file.includes('AdminRBAC')) label='Role Nature Type';
        else if(file.includes('AdminPayment')) label=s.slice(Math.max(0,node.getStart(source)-350),node.getStart(source)).includes('Priority')?'Priority':'Target Role';
        edits.push([open.tagName.end,open.tagName.end,` aria-label=${JSON.stringify(label)}`]);
      }
    }
    if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&['input','textarea'].includes(node.tagName.getText(source))) {
      const type=node.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='type');
      const typeText=type?.initializer?.getText(source)||'';
      const attr=node.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='className');
      if(!/checkbox|radio|file|hidden|range/.test(typeText)&&attr&&!/app-search-input|input-field|bg-transparent|sr-only/.test(attr.getText(source))) {
        const init=attr.initializer;
        if(ts.isStringLiteral(init)) edits.push([init.getStart(source)+1,init.getStart(source)+1,'app-control ']);
        else if(ts.isJsxExpression(init)) edits.push([init.getStart(source),init.end,`{\`app-control \${${init.expression.getText(source)}}\`}`]);
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  for(const [start,end,replacement]of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,start)+replacement+s.slice(end);
  if(hasSelect)s=`import { SelectField } from '../ui/SelectField';\n`+s;
  if(s!==fs.readFileSync(file,'utf8'))fs.writeFileSync(file,s);
}
