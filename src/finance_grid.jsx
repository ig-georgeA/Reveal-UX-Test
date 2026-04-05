import { useState, useMemo, useEffect } from "react";
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  contains, doesNotContain, equals, notEqual,
  greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual,
  addFilter, customFilter
} from '@igniteui/material-icons-extended';

// Render SVG string exported by @igniteui/material-icons-extended
function IgxIcon({ icon, size = 14, style }) {
  return (
    <span
      aria-hidden="true"
      style={{ display:'inline-flex', alignItems:'center', width:size, height:size, flexShrink:0, ...style }}
      dangerouslySetInnerHTML={{ __html: icon.value
        .replace('<svg ', `<svg width="${size}" height="${size}" style="fill:currentColor;" `)
      }}
    />
  );
}

const CATEGORIES = ['Subscriptions','Electric','Phone','Groceries','Dining','Mortgage','Insurance','Internet','Water','Gas','Car Payment','Entertainment','Healthcare','Gym','Streaming'];

const MERCHANTS = {
  Subscriptions: ['Adobe Creative Cloud','Microsoft 365','Dropbox Pro','LastPass','Notion','1Password'],
  Electric: ['Pacific Gas & Electric','Con Edison','Duke Energy','Georgia Power'],
  Phone: ['AT&T Wireless','Verizon Wireless','T-Mobile','Sprint'],
  Groceries: ['Whole Foods Market','Trader Joe\'s','Kroger','Safeway','Costco Wholesale','Aldi'],
  Dining: ['Chipotle Mexican Grill','Starbucks Coffee','McDonald\'s','Pizza Hut','Local Sushi Bar','Panera Bread'],
  Mortgage: ['Bank of America Mortgage','Chase Home Lending','Wells Fargo Mortgage'],
  Insurance: ['State Farm Insurance','Geico','Allstate Insurance','Progressive'],
  Internet: ['Comcast Xfinity','AT&T Fiber','Spectrum','Verizon FiOS'],
  Water: ['City Water Department','Municipal Water Authority'],
  Gas: ['SoCalGas','National Gas Company','Columbia Gas','Piedmont Natural Gas'],
  'Car Payment': ['Toyota Financial Services','Honda Financial','Ford Motor Credit','BMW Financial'],
  Entertainment: ['AMC Theaters','Steam Store','PlayStation Store','Apple App Store','Ticketmaster'],
  Healthcare: ['CVS Pharmacy','Walgreens Pharmacy','Kaiser Permanente','UnitedHealthcare Premium'],
  Gym: ['Planet Fitness','LA Fitness','Gold\'s Gym','CrossFit NorthEnd'],
  Streaming: ['Netflix','Hulu','Disney+','HBO Max','Apple TV+','Amazon Prime Video'],
};

const ACCOUNTS = ['Checking — 4521','Savings — 8832','Credit Card — 9912'];

function rnd(min, max) { return min + Math.random() * (max - min); }
function pad(n) { return String(n).padStart(2,'0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fmtAmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }

function genData() {
  const rows = [];
  const base = new Date(2024,11,31);
  const amtRange = {
    Mortgage:[1400,3200], 'Car Payment':[260,780], Groceries:[38,270], Dining:[10,115],
    Subscriptions:[5,60], Streaming:[8,22], Electric:[58,340], Phone:[39,195],
    Internet:[49,120], Water:[18,95], Gas:[28,175], Insurance:[75,390],
    Healthcare:[14,480], Gym:[18,95], Entertainment:[10,190],
  };
  for (let i=0;i<115;i++) {
    const daysAgo = Math.floor(rnd(0,365));
    const d = new Date(base);
    d.setDate(d.getDate()-daysAgo);
    const cat = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)];
    const merch = MERCHANTS[cat][Math.floor(Math.random()*MERCHANTS[cat].length)];
    const isCredit = Math.random()<0.13;
    const type = isCredit?'Credit':'Debit';
    const [lo,hi] = isCredit?[50,4800]:(amtRange[cat]||[10,500]);
    const amount = parseFloat(rnd(lo,hi).toFixed(2));
    rows.push({ id:i+1, date:fmtDate(d), description:merch, category:cat,
      account:ACCOUNTS[Math.floor(Math.random()*ACCOUNTS.length)], type, amount });
  }
  rows.sort((a,b)=>b.date.localeCompare(a.date));
  return rows;
}

const DATA = genData();

const COLS = [
  {key:'date',   label:'Date',        type:'date',   width:116},
  {key:'description', label:'Description', type:'select', flex:1.8},
  {key:'category', label:'Category',  type:'select', flex:1},
  {key:'account', label:'Account',    type:'select', flex:1.2},
  {key:'type',   label:'Type',        type:'select', width:88},
  {key:'amount', label:'Amount',      type:'number', width:112, align:'right'},
];

const UNIQUE = {
  description:[...new Set(Object.values(MERCHANTS).flat())].sort(),
  category:[...new Set(DATA.map(t=>t.category))].sort(),
  account:[...new Set(DATA.map(t=>t.account))].sort(),
  type:['Debit','Credit'],
};


// Applies a single column's filter — shared by filtered useMemo and colAvailableVals
function applyColFilter(data, col, filter, cond) {
  const f = filter; const k = col.key;
  if (!f) return data;
  if (col.type==='text' && typeof f==='string' && f.trim()) {
    const fv = f.trim().toLowerCase();
    if (cond==='contains')        return data.filter(r=>r[k].toLowerCase().includes(fv));
    if (cond==='doesNotContain')  return data.filter(r=>!r[k].toLowerCase().includes(fv));
    if (cond==='equals')          return data.filter(r=>r[k].toLowerCase()===fv);
    if (cond==='notEqual')        return data.filter(r=>r[k].toLowerCase()!==fv);
  } else if (col.type==='select' && Array.isArray(f) && f.length) {
    if (cond==='notIn') return data.filter(r=>!f.includes(r[k]));
    return data.filter(r=>f.includes(r[k]));
  } else if (col.type==='date') {
    if (cond==='between') { let d=data; if(f.from) d=d.filter(r=>r[k]>=f.from); if(f.to) d=d.filter(r=>r[k]<=f.to); return d; }
    if (cond==='before') return data.filter(r=>r[k]<(f.from||f.to));
    if (cond==='after')  return data.filter(r=>r[k]>(f.from||f.to));
    if (cond==='on')     return data.filter(r=>r[k]===(f.from||f.to));
  } else if (col.type==='number') {
    if (cond==='between') { let d=data; if(f.min!==undefined) d=d.filter(r=>r[k]>=f.min); if(f.max!==undefined) d=d.filter(r=>r[k]<=f.max); return d; }
    const v = f.min!==undefined ? f.min : f.max;
    if (cond==='gt')  return data.filter(r=>r[k]>v);
    if (cond==='gte') return data.filter(r=>r[k]>=v);
    if (cond==='lt')  return data.filter(r=>r[k]<v);
    if (cond==='lte') return data.filter(r=>r[k]<=v);
    if (cond==='eq')  return data.filter(r=>r[k]===v);
    if (cond==='neq') return data.filter(r=>r[k]!==v);
  }
  return data;
}

function ChevronDown() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChevronRight() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M4 2.5L6.5 5L4 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function XIcon({size=10}) {
  return <svg width={size} height={size} viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function SortAsc() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L8 7H2L5 2Z" fill="currentColor"/></svg>;
}
function SortDesc() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L2 3H8L5 8Z" fill="currentColor"/></svg>;
}
function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3.5V14.5M3.5 9H14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function GridIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2.5" width="14" height="2.5" rx="1" fill="currentColor"/><rect x="2" y="7.5" width="14" height="2.5" rx="1" fill="currentColor"/><rect x="2" y="12.5" width="14" height="2.5" rx="1" fill="currentColor"/></svg>;
}

// ── Filter conditions per column type ──────────────────────────────────────
const CONDITIONS = {
  text: [
    { key:'contains',       label:'Contains',        icon: contains },
    { key:'doesNotContain', label:'Does Not Contain', icon: doesNotContain },
    { key:'equals',         label:'Equals',           icon: equals },
    { key:'notEqual',       label:'Does Not Equal',   icon: notEqual },
  ],
  select: [
    { key:'in',    label:'Is Any Of', icon: addFilter },
    { key:'notIn', label:'Is None Of',icon: customFilter },
  ],
  date: [
    { key:'between',     label:'Is Between',       icon: equals },
    { key:'before',      label:'Is Before',        icon: lessThan },
    { key:'after',       label:'Is After',         icon: greaterThan },
    { key:'on',          label:'Is On',            icon: equals },
  ],
  number: [
    { key:'between',  label:'Is Between',        icon: equals },
    { key:'eq',       label:'Equals',            icon: equals },
    { key:'neq',      label:'Not Equal',         icon: notEqual },
    { key:'gt',       label:'Greater Than',      icon: greaterThan },
    { key:'gte',      label:'Greater or Equal',  icon: greaterThanOrEqual },
    { key:'lt',       label:'Less Than',         icon: lessThan },
    { key:'lte',      label:'Less or Equal',     icon: lessThanOrEqual },
  ],
};

function defaultCondition(type) {
  return CONDITIONS[type]?.[0]?.key ?? 'contains';
}

function filterTooltip(filter, type) {
  if (type === 'select' && Array.isArray(filter) && filter.length > 1) {
    return filter.join('\n');
  }
  return null;
}

function filterSummary(filter, type, condition) {
  if (!filter) return null;
  const cond = CONDITIONS[type]?.find(c => c.key === condition);
  const condLabel = cond ? cond.label : '';
  if (type==='text') return filter ? `${condLabel}: "${filter}"` : null;
  if (type==='select') {
    if (!Array.isArray(filter) || !filter.length) return null;
    if (filter.length === 1) return filter[0];
    return `${filter.length} selected`;
  }
  if (type==='date') {
    if (condition === 'between') {
      if (filter.from && filter.to) {
        // Check if this range matches a known preset label
        const preset = getDatePresets().find(p => p.from === filter.from && p.to === filter.to);
        if (preset) return preset.label;
        return `${filter.from} – ${filter.to}`;
      }
      if (filter.from) return `from ${filter.from}`;
      if (filter.to) return `until ${filter.to}`;
      return null;
    }
    return filter.from || filter.to || null;
  }
  if (type==='number') {
    if (condition === 'between') {
      if (filter.min!==undefined&&filter.max!==undefined) return `$${filter.min}–$${filter.max}`;
      if (filter.min!==undefined) return `≥ $${filter.min}`;
      if (filter.max!==undefined) return `≤ $${filter.max}`;
      return null;
    }
    if (filter.min !== undefined) return `${condLabel} $${filter.min}`;
    if (filter.max !== undefined) return `${condLabel} $${filter.max}`;
    return null;
  }
  return null;
}

function hasActiveFilter(filter, type, condition) {
  return !!filterSummary(filter, type, condition);
}

function emptyFilterValue(type) {
  if (type === 'select') return [];
  if (type === 'date' || type === 'number') return {};
  return '';
}

function normalizeFilterValue(type, value) {
  if (type === 'text') {
    const next = typeof value === 'string' ? value.trim() : '';
    return next ? next : null;
  }

  if (type === 'select') {
    const next = Array.isArray(value)
      ? value.filter((v, i, arr) => v && arr.indexOf(v) === i)
      : [];
    return next.length ? next : null;
  }

  if (type === 'date') {
    const from = value?.from || undefined;
    const to = value?.to || undefined;
    return from || to ? { from, to } : null;
  }

  if (type === 'number') {
    const min = Number.isFinite(value?.min) ? value.min : undefined;
    const max = Number.isFinite(value?.max) ? value.max : undefined;
    return min !== undefined || max !== undefined ? { min, max } : null;
  }

  return null;
}

function getDatePresets() {
  const today = new Date();
  const fn = n => { const d = new Date(today); d.setDate(d.getDate() - n); return fmtDate(d); };
  return [
    { label:'Today',         from:fmtDate(today), to:fmtDate(today) },
    { label:'Yesterday',     from:fn(1),           to:fn(1) },
    { label:'Last 7 Days',   from:fn(6),           to:fmtDate(today) },
    { label:'Last 30 Days',  from:fn(29),          to:fmtDate(today) },
    { label:'Last Month',    from:fmtDate(new Date(today.getFullYear(),today.getMonth()-1,1)), to:fmtDate(new Date(today.getFullYear(),today.getMonth(),0)) },
    { label:'Last 3 Months', from:fmtDate(new Date(today.getFullYear(),today.getMonth()-3,today.getDate())), to:fmtDate(today) },
    { label:'Last Year',     from:`${today.getFullYear()-1}-01-01`, to:`${today.getFullYear()-1}-12-31` },
    { label:'This Year',     from:`${today.getFullYear()}-01-01`,   to:fmtDate(today) },
  ];
}

// ── Popover content built with Radix Popover ────────────────────────────────
// initialSelectedSet: snapshot of which items were selected when the popover
// opened — used to freeze grouping so items don't jump as checkboxes change.
function FilterPopoverContent({ col, value, condition, uniqueVals, initialSelectedSet, availableVals, onValueChange, onCommit, onCancel, onClearAll, onApplyPreset }) {
  const draftIsEmpty = normalizeFilterValue(col.type, value) === null;
  const [selectQuery, setSelectQuery] = useState('');
  const [showDatePresets, setShowDatePresets] = useState(false);

  // Auto-select entries matching the typed query — appends to existing selection
  // Only considers items that aren't filtered out by other columns.
  // Uses initialSelectedSet (snapshot at open time) as the base so intermediate
  // keystrokes don't accumulate — result is always: snapshot ∪ current matches.
  useEffect(() => {
    if (col.type !== 'select') return;
    const q = selectQuery.trim().toLowerCase();
    if (!q) return;
    const matches = (uniqueVals || [])
      .filter(v => v.toLowerCase().includes(q))
      .filter(v => !availableVals || availableVals.has(v));
    if (!matches.length) return;
    const tid = setTimeout(() => {
      onValueChange([...new Set([...initialSelectedSet, ...matches])]);
    }, 0);
    return () => clearTimeout(tid);
  }, [selectQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset query when column changes (deferred to avoid render-cycle setState)
  useEffect(() => {
    const tid = setTimeout(() => setSelectQuery(''), 0);
    return () => clearTimeout(tid);
  }, [col.key]);

  // Use the open-time snapshot for grouping so checked items don't jump positions
  const q = selectQuery.trim().toLowerCase();
  const filteredVals   = (uniqueVals || []).filter(v => !q || v.toLowerCase().includes(q));
  const selectedVals   = filteredVals.filter(v => initialSelectedSet.has(v));
  const availableOther = filteredVals.filter(v => !initialSelectedSet.has(v) && (!availableVals || availableVals.has(v)));
  const disabledOther  = filteredVals.filter(v => !initialSelectedSet.has(v) && availableVals && !availableVals.has(v));

  const isSingleVal = col.type === 'number' && condition !== 'between';
  const singleKey   = ['gt','gte','lt','lte','eq','neq'].includes(condition) ? (condition.startsWith('lt')?'max':'min') : null;

  return (
    <Popover.Portal>
      <Popover.Content
        onInteractOutside={onCommit}
        onEscapeKeyDown={onCancel}
        side="bottom"
        sideOffset={-44}
        align="start"
        avoidCollisions={false}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
        }}
        style={{
          background:'#FFFFFF',
          border:'0.5px solid #DCD7E5',
          borderRadius:8,
          padding:14,
          minWidth:240,
          boxShadow:'0 4px 20px rgba(0,0,0,0.13)',
          zIndex:9999,
          fontFamily:'"Inter","Segoe UI",sans-serif',
          outline:'none',
        }}
      >
        {/* Text input */}
        {col.type === 'text' && (
          <input
            type="text"
            placeholder={`Type to filter ${col.label}…`}
            value={value || ''}
            onChange={e => onValueChange(e.target.value)}
            autoFocus
            style={{width:'100%',fontSize:13,boxSizing:'border-box',
              padding:'6px 8px',border:'0.5px solid #DCD7E5',borderRadius:6,
              outline:'none',fontFamily:'inherit',color:'#575064'}}
          />
        )}

        {/* Select list */}
        {col.type === 'select' && (
          <div>
            <input
              type="text"
              placeholder={`Type to filter ${col.label}…`}
              value={selectQuery}
              onChange={e => setSelectQuery(e.target.value)}
              autoFocus
              style={{width:'100%',fontSize:13,boxSizing:'border-box',
                padding:'6px 8px',border:'0.5px solid #DCD7E5',borderRadius:6,
                outline:'none',fontFamily:'inherit',color:'#575064',marginBottom:6}}
            />
            <div style={{maxHeight:220,overflowY:'auto',border:'0.5px solid #E8E4EF',borderRadius:6}}>
              {/* Render using open-time snapshot order; live value drives checkbox state */}
              {selectedVals.map(v => (
                <label key={`s-${v}`} style={{display:'flex',alignItems:'center',gap:8,
                  padding:'6px 10px',cursor:'pointer',fontSize:13,color:'#575064',
                  background:'#F8F7FA'}}>
                  <input type="checkbox"
                    checked={Array.isArray(value) && value.includes(v)}
                    onChange={()=>{
                      const arr=Array.isArray(value)?[...value]:[];
                      const next = arr.includes(v) ? arr.filter(x=>x!==v) : [...arr,v];
                      onValueChange(next);
                    }} style={{accentColor:'#6988FF',flexShrink:0}}/>
                  {v}
                </label>
              ))}
              {selectedVals.length > 0 && (availableOther.length > 0 || disabledOther.length > 0) && (
                <div style={{height:1,background:'#E8E4EF',margin:'2px 0'}} />
              )}
              {availableOther.map(v => (
                <label key={`o-${v}`} style={{display:'flex',alignItems:'center',gap:8,
                  padding:'6px 10px',cursor:'pointer',fontSize:13,color:'#575064'}}>
                  <input type="checkbox"
                    checked={Array.isArray(value) && value.includes(v)}
                    onChange={()=>{
                      const arr=Array.isArray(value)?[...value]:[];
                      const next = arr.includes(v) ? arr.filter(x=>x!==v) : [...arr,v];
                      onValueChange(next);
                    }} style={{accentColor:'#6988FF',flexShrink:0}}/>
                  {v}
                </label>
              ))}
              {disabledOther.length > 0 && (
                <>
                  <div style={{height:1,background:'#E8E4EF',margin:'2px 0'}} />
                  <div style={{padding:'4px 10px 3px',fontSize:10.5,fontWeight:500,
                    textTransform:'uppercase',letterSpacing:.5,color:'#ADA7B8'}}>
                    Filtered by other columns
                  </div>
                  {disabledOther.map(v => (
                    <label key={`d-${v}`}
                      title="Filtered out by another column"
                      style={{display:'flex',alignItems:'center',gap:8,
                        padding:'6px 10px',cursor:'not-allowed',fontSize:13,
                        color:'#C4BFD0',opacity:.7,userSelect:'none'}}>
                      <input type="checkbox" disabled checked={false}
                        style={{accentColor:'#6988FF',flexShrink:0,cursor:'not-allowed'}}/>
                      {v}
                    </label>
                  ))}
                </>
              )}
              {selectedVals.length === 0 && availableOther.length === 0 && disabledOther.length === 0 && (
                <div style={{padding:'10px',fontSize:12.5,color:'#877F93',textAlign:'center'}}>No matches</div>
              )}
            </div>
          </div>
        )}

        {/* Date range */}
        {col.type === 'date' && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {/* Date Presets drilldown */}
            <div>
              <button
                onClick={()=>setShowDatePresets(p=>!p)}
                style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  width:'100%',padding:'7px 10px',boxSizing:'border-box',
                  background:showDatePresets?'#EEF1FF':'none',
                  border:'0.5px solid #E8E4EF',borderRadius:6,
                  cursor:'pointer',fontSize:13,fontFamily:'inherit',
                  color:'#575064',transition:'background .12s',
                }}
                onMouseEnter={e=>{ if(!showDatePresets) e.currentTarget.style.background='#F5F4F9'; }}
                onMouseLeave={e=>{ if(!showDatePresets) e.currentTarget.style.background='none'; }}
              >
                <span style={{fontWeight:500,color:showDatePresets?'#4B6EF5':'#575064'}}>Date Filters</span>
                {showDatePresets ? <ChevronDown/> : <ChevronRight/>}
              </button>
              {showDatePresets && (
                <div style={{marginTop:4,border:'0.5px solid #E8E4EF',borderRadius:6,overflow:'hidden'}}>
                  {getDatePresets().map(p=>(
                    <button key={p.label}
                      onClick={()=>onApplyPreset(p.from,p.to)}
                      style={{
                        display:'block',width:'100%',padding:'7px 14px',boxSizing:'border-box',
                        background:'none',border:'none',borderBottom:'0.5px solid #F1EFF5',
                        cursor:'pointer',fontSize:13,fontFamily:'inherit',
                        textAlign:'left',color:'#575064',transition:'background .12s',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F5F4F9'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}
                    >{p.label}</button>
                  ))}
                </div>
              )}
              <div style={{height:1,background:'#E8E4EF',margin:'8px 0 4px'}}/>
            </div>

            {condition === 'between' ? (
              ['from','to'].map(k => (
                <div key={k}>
                  <div style={{fontSize:11,color:'#877F93',textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>{k==='from'?'From':'To'}</div>
                  <input type="date" value={(value&&value[k])||''}
                    style={{width:'100%',fontSize:13,boxSizing:'border-box',padding:'6px 8px',
                      border:'0.5px solid #DCD7E5',borderRadius:6,outline:'none',fontFamily:'inherit'}}
                    onChange={e=>onValueChange(p=>({...(p||{}),[k]:e.target.value}))}/>
                </div>
              ))
            ) : (
              <div>
                <div style={{fontSize:11,color:'#877F93',textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>Date</div>
                <input type="date" autoFocus value={(value&&value.from)||''}
                  style={{width:'100%',fontSize:13,boxSizing:'border-box',padding:'6px 8px',
                    border:'0.5px solid #DCD7E5',borderRadius:6,outline:'none',fontFamily:'inherit'}}
                  onChange={e=>onValueChange({from:e.target.value,to:e.target.value})}/>
              </div>
            )}
          </div>
        )}

        {/* Number */}
        {col.type === 'number' && (
          isSingleVal && singleKey ? (
            <div>
              <div style={{fontSize:11,color:'#877F93',textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>Amount ($)</div>
              <input type="number" autoFocus placeholder="0"
                value={(value&&value[singleKey]!==undefined)?value[singleKey]:''}
                style={{width:'100%',fontSize:13,boxSizing:'border-box',padding:'6px 8px',
                  border:'0.5px solid #DCD7E5',borderRadius:6,outline:'none',fontFamily:'inherit'}}
                onChange={e=>onValueChange({[singleKey]:e.target.value!==''?parseFloat(e.target.value):undefined})}/>
            </div>
          ) : (
            <div style={{display:'flex',gap:8}}>
              {[['min','Min ($)'],['max','Max ($)']].map(([k,lbl])=>(
                <div key={k} style={{flex:1}}>
                  <div style={{fontSize:11,color:'#877F93',textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>{lbl}</div>
                  <input type="number" placeholder={k==='min'?'0':'∞'}
                    style={{width:'100%',fontSize:13,boxSizing:'border-box',padding:'6px 8px',
                      border:'0.5px solid #DCD7E5',borderRadius:6,outline:'none',fontFamily:'inherit'}}
                    value={(value&&value[k]!==undefined)?value[k]:''}
                    onChange={e=>onValueChange(p=>({...(p||{}),[k]:e.target.value!==''?parseFloat(e.target.value):undefined}))}/>
                </div>
              ))}
            </div>
          )
        )}

        {/* Footer: CLEAR | APPLY */}
        <div style={{display:'flex',justifyContent:'flex-end',gap:6,marginTop:12,paddingTop:10,borderTop:'0.5px solid #E8E4EF'}}>
          <button
            disabled={draftIsEmpty}
            onClick={onClearAll}
            style={{
              padding:'5px 13px',fontSize:12.5,fontFamily:'inherit',
              border:'0.5px solid #DCD7E5',borderRadius:6,cursor:draftIsEmpty?'default':'pointer',
              background:'none',color:draftIsEmpty?'#C4BFD0':'#575064',
              transition:'background .12s',
            }}
            onMouseEnter={e=>{ if(!draftIsEmpty) e.currentTarget.style.background='#F5F4F9'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='none'; }}
          >Clear</button>
          <button
            onClick={onCommit}
            style={{
              padding:'5px 13px',fontSize:12.5,fontFamily:'inherit',
              border:'none',borderRadius:6,cursor:'pointer',
              background:'#4B6EF5',color:'#fff',fontWeight:500,
              transition:'opacity .12s',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.opacity='0.85'; }}
            onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; }}
          >Apply</button>
        </div>
      </Popover.Content>
    </Popover.Portal>
  );
}

function FilterCell({col, filter, condition, onChange, onConditionChange, onClear, availableVals}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => filter ?? emptyFilterValue(col.type));
  const [draftCond, setDraftCond] = useState(() => condition ?? defaultCondition(col.type));
  // Snapshot of which items were checked when the popover opened —
  // frozen so groups don't shift as the user checks/unchecks items.
  const [openSnapshot, setOpenSnapshot] = useState(() => new Set());

  // Keep draft in sync when popover opens
  useEffect(() => {
    if (open) {
      // Defer to avoid synchronous state update in effect
      const tid = setTimeout(() => {
        const currentFilter = filter ?? emptyFilterValue(col.type);
        setDraft(currentFilter);
        setDraftCond(condition ?? defaultCondition(col.type));
        // Snapshot which items are selected right now
        setOpenSnapshot(new Set(Array.isArray(currentFilter) ? currentFilter : []));
      }, 0);
      return () => clearTimeout(tid);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = hasActiveFilter(filter, col.type, condition);
  const summary = filterSummary(filter, col.type, condition);
  const tooltip = filterTooltip(filter, col.type, condition);
  const condList = CONDITIONS[col.type] || [];
  const activeCond = condList.find(c => c.key === (condition ?? defaultCondition(col.type)));
  const isDatePreset = col.type === 'date' && active &&
    getDatePresets().some(p => p.from === filter?.from && p.to === filter?.to);

  const commit = () => {
    onChange(normalizeFilterValue(col.type, draft), draftCond);
    setOpen(false);
  };
  const cancel = () => {
    setDraft(filter ?? emptyFilterValue(col.type));
    setOpen(false);
  };
  const clearAll = () => {
    onClear();
    setDraft(emptyFilterValue(col.type));
    setOpen(false);
  };
  const applyPreset = (from, to) => {
    onChange(normalizeFilterValue(col.type, {from, to}), 'between');
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={v => { if (!v) commit(); else setOpen(true); }}>
      <div style={{
        display:'flex',alignItems:'center',
        overflow:'hidden',
        borderRight:'0.5px solid #E8E4EF',
        background:'#FFFFFF',
        height:44,
      }}>
        {active ? (
          // Chip layout: [condition ▾] [pill: summary | ×]
          <div style={{
            display:'flex',alignItems:'center',padding:'0 6px',gap:4,
            width:'100%',height:'100%',boxSizing:'border-box',
          }}>
            {/* Condition dropdown — hidden for date presets */}
            {!isDatePreset && <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  title={activeCond?.label}
                  style={{
                    display:'flex',alignItems:'center',justifyContent:'center',
                    gap:2,padding:'0 4px',height:26,borderRadius:5,
                    background:'none',border:'none',
                    cursor:'pointer',color:'#4B6EF5',flexShrink:0,
                    transition:'background .12s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='#EEF1FF'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  {activeCond && <IgxIcon icon={activeCond.icon} size={13} />}
                  <ChevronDown/>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={4}
                  align="start"
                  style={{
                    background:'#FFFFFF',border:'0.5px solid #DCD7E5',
                    borderRadius:8,padding:'4px',
                    boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                    zIndex:10000,minWidth:190,
                    fontFamily:'"Inter","Segoe UI",sans-serif',
                  }}
                >
                  {condList.map(c => (
                    <DropdownMenu.Item
                      key={c.key}
                      onSelect={() => { onConditionChange(c.key); }}
                      style={{
                        display:'flex',alignItems:'center',gap:8,
                        padding:'7px 10px',cursor:'pointer',
                        fontSize:13,borderRadius:5,outline:'none',
                        color: c.key === (condition ?? defaultCondition(col.type)) ? '#4B6EF5' : '#575064',
                        background: c.key === (condition ?? defaultCondition(col.type)) ? '#EEF1FF' : 'transparent',
                        fontWeight: c.key === (condition ?? defaultCondition(col.type)) ? 500 : 400,
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='#F5F4F9'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background = c.key === (condition ?? defaultCondition(col.type)) ? '#EEF1FF':'transparent'; }}
                    >
                      <IgxIcon icon={c.icon} size={14} />
                      {c.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>}

            {/* Value chip */}
            <div style={{
              flex:1,minWidth:80, maxWidth: 150,display:'flex',alignItems:'center',
              background:'#EEF1FF',border:'0.5px solid #B5C0F5',
              borderRadius:6,overflow:'hidden',height:28,
            }}>
              <Popover.Trigger asChild>
                <button
                  onClick={() => setOpen(true)}
                  title={tooltip || summary || undefined}
                  style={{
                    flex:1,minWidth:0,height:'100%',
                    background:'none',border:'none',cursor:'pointer',
                    padding:'0 6px 0 10px',textAlign:'left',
                    transition:'background .12s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(73,110,245,0.08)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  <span style={{
                    display:'block',fontSize:12.5,fontWeight:500,color:'#4B6EF5',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                  }}>{summary}</span>
                </button>
              </Popover.Trigger>
              <button
                onClick={e=>{e.stopPropagation();onClear();}}
                style={{
                  flexShrink:0,width:26,height:'100%',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'none',border:'none',borderLeft:'0.5px solid #B5C0F5',
                  cursor:'pointer',color:'#6988FF',padding:0,
                  transition:'background .12s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(73,110,245,0.12)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              ><XIcon size={9}/></button>
            </div>
          </div>
        ) : (
          // Inactive – plain filter button
          <Popover.Trigger asChild>
            <button
              onClick={() => setOpen(true)}
              style={{
                display:'flex',alignItems:'center',gap:5,
                padding:'0 8px 0 6px',width:'100%',height:'100%',
                background:'none',border:'none',cursor:'pointer',
                color:'#877F93',fontSize:12,fontFamily:'inherit',
                transition:'background .12s, color .12s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#F5F4F9'; e.currentTarget.style.color='#575064'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='#877F93'; }}
            >
              <IgxIcon icon={addFilter} size={15} />
              <span>Filter</span>
            </button>
          </Popover.Trigger>
        )}
      </div>

      {open && (
        <FilterPopoverContent
          col={col}
          value={draft}
          condition={draftCond}
          uniqueVals={UNIQUE[col.key]}
          initialSelectedSet={openSnapshot}
          availableVals={availableVals}
          onValueChange={setDraft}
          onCommit={commit}
          onCancel={cancel}
          onClearAll={clearAll}
          onApplyPreset={applyPreset}
        />
      )}
    </Popover.Root>
  );
}

function ColHeader({col, sortCfg, onSort}) {
  const active = sortCfg.key===col.key;
  const numeric = col.type==='number';
  return (
    <div onClick={()=>onSort(col.key)} style={{
      display:'flex',alignItems:'center',justifyContent:numeric?'flex-end':'flex-start',
      padding:'0 4px 0 14px',height:46,
      overflow:'hidden',
      borderRight:'0.5px solid var(--color-border-secondary)',
      background:'var(--color-background-primary)',
      userSelect:'none',cursor:'pointer',
    }}>
      <span style={{
        fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',
        textTransform:'uppercase',letterSpacing:.5,flex:1,
        textAlign:numeric?'right':'left',
      }}>{col.label}</span>
      {active && <span style={{color:'var(--color-text-secondary)',marginLeft:3}}>
        {sortCfg.dir==='asc'?<SortAsc/>:<SortDesc/>}
      </span>}
    </div>
  );
}

function DataRow({row, even, gridTemplate}) {
  return (
    <div style={{
      display:'grid',gridTemplateColumns:gridTemplate,minWidth:900,
      background:even?'var(--color-background-secondary)':'var(--color-background-primary)',
      borderBottom:'0.5px solid var(--color-border-tertiary)',
    }}>
      {COLS.map(col=>{
        const v = row[col.key];
        const numeric = col.type==='number';
        const isType = col.key==='type';
        const color = isType
          ? (v==='Credit'?'#1A7A4A':'#B03A2E')
          : numeric
            ? (row.type==='Credit'?'#1A7A4A':'var(--color-text-primary)')
            : 'var(--color-text-primary)';
        return (
          <div key={col.key} style={{
            display:'flex',alignItems:'center',justifyContent:numeric?'flex-end':'flex-start',
            padding:'0 14px',height:42,
            overflow:'hidden',
            borderRight:'0.5px solid var(--color-border-tertiary)',
          }}>
            <span style={{fontSize:13,color,fontWeight:isType?500:400,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {numeric?fmtAmt(v):v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FilterChip({label, value, onRemove}) {
  return (
    <div style={{
      display:'flex',alignItems:'center',
      background:'#EEF1FF',
      border:'0.5px solid #B5C0F5',
      borderRadius:6,padding:'4px 4px 4px 10px',fontSize:13,
      color:'#575064',gap:5,flexShrink:0,
    }}>
      <IgxIcon icon={customFilter} size={13} style={{color:'#4B6EF5'}}/>
      <span style={{fontSize:13,color:'#4B6EF5'}}>{label}: </span>
      <strong style={{fontSize:13,fontWeight:500,color:'var(--color-text-primary)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</strong>
      <div style={{width:1,height:14,background:'var(--color-border-secondary)',margin:'0 2px'}}/>
      <button onClick={onRemove} style={{
        display:'flex',alignItems:'center',justifyContent:'center',
        width:20,height:20,background:'none',border:'none',borderRadius:16,
        cursor:'pointer',color:'var(--color-text-tertiary)',padding:0,
      }}><XIcon size={9}/></button>
    </div>
  );
}

function AddFilterPanel({onApply, onClose}) {
  const [selCol, setSelCol] = useState(COLS[0].key);
  const [val, setVal] = useState(null);
  const col = COLS.find(c=>c.key===selCol);

  const reset = (key) => {
    setSelCol(key);
    const c = COLS.find(x=>x.key===key);
    setVal(c.type==='select'?[]:c.type==='date'||c.type==='number'?{}:'');
  };

  return (
    <div style={{
      minHeight:360,background:'rgba(0,0,0,0.32)',display:'flex',
      alignItems:'center',justifyContent:'center',
      borderRadius:10,padding:20,
    }}>
      <div style={{
        background:'var(--color-background-primary)',borderRadius:10,padding:24,
        width:340,border:'0.5px solid var(--color-border-secondary)',
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontWeight:500,fontSize:15,color:'var(--color-text-primary)'}}>Add filter</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-tertiary)'}}>
            <XIcon size={14}/>
          </button>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>Field</div>
          <select value={selCol} onChange={e=>reset(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:'0.5px solid var(--color-border-secondary)',
              borderRadius:6,fontSize:13.5,color:'var(--color-text-primary)',
              background:'var(--color-background-primary)',cursor:'pointer',fontFamily:'inherit'}}>
            {COLS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>Value</div>
          {col?.type==='text' && (
            <input type="text" placeholder={`Search ${col.label.toLowerCase()}…`}
              value={val||''} onChange={e=>setVal(e.target.value)}
              style={{width:'100%',fontSize:13}} autoFocus/>
          )}
          {col?.type==='select' && (
            <div style={{border:'0.5px solid var(--color-border-tertiary)',borderRadius:6,maxHeight:160,overflowY:'auto'}}>
              {(UNIQUE[selCol]||[]).map(v=>(
                <label key={v} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',cursor:'pointer',fontSize:13,color:'var(--color-text-primary)'}}>
                  <input type="checkbox" checked={Array.isArray(val)&&val.includes(v)}
                    onChange={e=>{
                      const arr=Array.isArray(val)?[...val]:[];
                      setVal(e.target.checked?[...arr,v]:arr.filter(x=>x!==v));
                    }} style={{accentColor:'#6988FF'}}/>
                  {v}
                </label>
              ))}
            </div>
          )}
          {col?.type==='date' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[['from','From'],['to','To']].map(([k,lbl])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:'var(--color-text-tertiary)',marginBottom:3}}>{lbl}</div>
                  <input type="date" value={(val&&val[k])||''} style={{width:'100%',fontSize:13}}
                    onChange={e=>setVal(p=>({...(p||{}),[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
          )}
          {col?.type==='number' && (
            <div style={{display:'flex',gap:8}}>
              {[['min','Min ($)'],['max','Max ($)']].map(([k,lbl])=>(
                <div key={k} style={{flex:1}}>
                  <div style={{fontSize:11,color:'var(--color-text-tertiary)',marginBottom:3}}>{lbl}</div>
                  <input type="number" placeholder={k==='min'?'0':'No limit'} style={{width:'100%',fontSize:13}}
                    value={(val&&val[k]!==undefined)?val[k]:''}
                    onChange={e=>setVal(p=>({...(p||{}),[k]:e.target.value!==''?parseFloat(e.target.value):undefined}))}/>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={onClose} style={{
            padding:'7px 14px',background:'none',border:'0.5px solid var(--color-border-secondary)',
            borderRadius:6,cursor:'pointer',fontSize:13,color:'var(--color-text-secondary)',fontFamily:'inherit',
          }}>Cancel</button>
          <button onClick={()=>{if(val!==null&&hasActiveFilter(val,col.type)){onApply(selCol,val);}onClose();}} style={{
            padding:'7px 14px',background:'#6988FF',border:'none',borderRadius:6,
            cursor:'pointer',fontSize:13,color:'#fff',fontWeight:500,fontFamily:'inherit',
          }}>Apply filter</button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceGrid() {
  const [colFilters, setColFilters] = useState({});
  const [colConditions, setColConditions] = useState({});
  const [sort, setSort] = useState({key:'date',dir:'desc'});

  const setFilter = (key, val, cond) => {
    setColFilters(p => ({...p, [key]: val}));
    if (cond) setColConditions(p => ({...p, [key]: cond}));
  };
  const clearFilter = (key) => {
    setColFilters(p => { const n={...p}; delete n[key]; return n; });
    setColConditions(p => { const n={...p}; delete n[key]; return n; });
  };
  const setCondition = (key, cond) => setColConditions(p => ({...p, [key]: cond}));

  const filtered = useMemo(()=>{
    let d=[...DATA];
    COLS.forEach(col=>{
      const f = colFilters[col.key];
      if (!f) return;
      const cond = colConditions[col.key] ?? defaultCondition(col.type);
      d = applyColFilter(d, col, f, cond);
    });
    d.sort((a,b)=>{
      const av=a[sort.key],bv=b[sort.key];
      const cmp=typeof av==='number'?av-bv:av<bv?-1:av>bv?1:0;
      return sort.dir==='asc'?cmp:-cmp;
    });
    return d;
  },[colFilters,colConditions,sort]);

  // For each select column: values present when ALL OTHER columns' filters are applied.
  // Items outside this set appear as disabled in the checkbox list.
  const colAvailableVals = useMemo(() => {
    const result = {};
    COLS.filter(c => c.type === 'select').forEach(targetCol => {
      let d = DATA;
      COLS.forEach(col => {
        if (col.key === targetCol.key) return;
        const f = colFilters[col.key];
        if (!f) return;
        const cond = colConditions[col.key] ?? defaultCondition(col.type);
        d = applyColFilter(d, col, f, cond);
      });
      result[targetCol.key] = new Set(d.map(row => row[targetCol.key]));
    });
    return result;
  }, [colFilters, colConditions]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDebit = filtered.filter(t=>t.type==='Debit').reduce((s,t)=>s+t.amount,0);
  const totalCredit = filtered.filter(t=>t.type==='Credit').reduce((s,t)=>s+t.amount,0);

  // Width for a fixed column when a chip is active:
  // chip maxWidth(180) + condition button(~34) + padding(12) + gap(4) = 230px
  const ACTIVE_COL_W = 230;
  const gridTemplate = COLS.map(col => {
    if (col.flex) return `${col.flex}fr`;
    const active = hasActiveFilter(
      colFilters[col.key],
      col.type,
      colConditions[col.key] ?? defaultCondition(col.type)
    );
    return `${active ? Math.max(col.width, ACTIVE_COL_W) : col.width}px`;
  }).join(' ');

  return (
    <div style={{
      '--color-background-primary':'#FFFFFF',
      '--color-background-secondary':'#F8F7FA',
      '--color-background-tertiary':'#F1EFF5',
      '--color-border-secondary':'#DCD7E5',
      '--color-border-tertiary':'#E8E4EF',
      '--color-text-primary':'#575064',
      '--color-text-secondary':'#6B6478',
      '--color-text-tertiary':'#877F93',
      '--font-sans':'"Inter", "Segoe UI", sans-serif',
      background:'var(--color-background-tertiary)',
      minHeight:'100vh',
      padding:10,
      fontFamily:'var(--font-sans)'
    }}>
      <div style={{background:'var(--color-background-primary)',borderRadius:6,overflow:'hidden',border:'0.5px solid var(--color-border-tertiary)'}}>

        {/* Header */}
        <div style={{padding:'14px 14px 10px 14px'}}>
          <div style={{fontSize:16,fontWeight:500,color:'var(--color-text-primary)'}}>
            Home Finance Transactions
          </div>
        </div>

        {/* Grid */}
        <div style={{overflowX:'auto',borderTop:'0.5px solid var(--color-border-tertiary)',borderBottom:'0.5px solid var(--color-border-tertiary)',margin:'0 14px',borderRadius:6,border:'0.5px solid var(--color-border-secondary)'}}>
          {/* Column headers */}
          <div style={{display:'grid',gridTemplateColumns:gridTemplate,minWidth:900,borderBottom:'1.5px solid var(--color-text-primary)',background:'var(--color-background-primary)'}}>
            {COLS.map(col=><ColHeader key={col.key} col={col} sortCfg={sort} onSort={k=>setSort(p=>({key:k,dir:p.key===k?(p.dir==='asc'?'desc':'asc'):'asc'}))}/>)}
          </div>

          {/* Filter row */}
          <div style={{display:'grid',gridTemplateColumns:gridTemplate,minWidth:900,borderBottom:'0.5px solid var(--color-border-secondary)',background:'var(--color-background-primary)'}}>
            {COLS.map(col=>(
              <FilterCell
                key={col.key}
                col={col}
                filter={colFilters[col.key]}
                condition={colConditions[col.key] ?? defaultCondition(col.type)}
                onChange={(v,cond)=>setFilter(col.key,v,cond)}
                onConditionChange={cond=>setCondition(col.key,cond)}
                onClear={()=>clearFilter(col.key)}
                availableVals={col.type==='select' ? colAvailableVals[col.key] : undefined}
              />
            ))}
          </div>

          {/* Rows */}
          <div style={{minWidth:900}}>
            {filtered.length===0 ? (
              <div style={{padding:'40px 8px',textAlign:'center',color:'var(--color-text-tertiary)',fontSize:14}}>
                No transactions match the current filters.
              </div>
            ) : filtered.map((row,i)=>(
              <DataRow key={row.id} row={row} even={i%2===0} gridTemplate={gridTemplate}/>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            background:'var(--color-background-secondary)',borderTop:'0.5px solid var(--color-border-secondary)',
            padding:'7px 14px',display:'flex',justifyContent:'flex-end',alignItems:'center',gap:16,
          }}>
            {filtered.length>0 ? <>
              <span style={{fontSize:11.5,color:'var(--color-text-tertiary)'}}>
                <span style={{color:'#B03A2E'}}>Debits: {fmtAmt(totalDebit)}</span>
                {'  ·  '}
                <span style={{color:'#1A7A4A'}}>Credits: {fmtAmt(totalCredit)}</span>
                {'  ·  '}
                <span style={{fontWeight:500,color:'var(--color-text-secondary)'}}>
                  Net: {fmtAmt(totalCredit-totalDebit)}
                </span>
              </span>
            </> : <span style={{fontSize:11.5,color:'var(--color-text-tertiary)'}}>Select values to see summary</span>}
          </div>
        </div>

        <div style={{height:4}}/>
      </div>
    </div>
  );
}
