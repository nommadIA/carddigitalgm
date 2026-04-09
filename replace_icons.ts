import fs from 'fs';
let content = fs.readFileSync('./pages/Configuracoes.tsx', 'utf8');

// Change icon colors
content = content.replace(/<Palette size=\{20\} className="text-slate-400" \/>/g, '<Palette size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<Paintbrush size=\{20\} className="text-slate-400" \/>/g, '<Paintbrush size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<ImageIcon size=\{20\} className="text-slate-400" \/>/g, '<ImageIcon size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<CreditCard size=\{20\} className="text-slate-400" \/>/g, '<CreditCard size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<FileText size=\{20\} className="text-slate-400" \/>/g, '<FileText size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<Bell size=\{20\} className="text-slate-400" \/>/g, '<Bell size={20} className="text-[var(--gm-primary)]" />');
content = content.replace(/<Type size=\{20\} className="text-slate-400" \/>/g, '<Type size={20} className="text-[var(--gm-primary)]" />');

// Change button styles translation
content = content.replace(/\{ id: "solid", name: "Preenchido Sólido" \},/g, '{ id: "solid", name: "Sólido" },');
content = content.replace(/\{ id: "neon", name: "Neon Frosted" \},/g, '{ id: "neon", name: "Neon Jateado" },');

fs.writeFileSync('./pages/Configuracoes.tsx', content);
console.log('Replaced successfully');
