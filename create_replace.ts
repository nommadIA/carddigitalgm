import fs from 'fs';

let content = fs.readFileSync('pages/Configuracoes.tsx', 'utf-8');

// The mobile cards use `!border-none !shadow-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4` etc.
// We will simply regex out the background and card components for the mobile view so it looks "solto" (loose).

// 1. Find all `Card` in the mobile section (from lines after `(viewMode as any) === "smartphone"` which is probably the `else` of `(viewMode as any) === "desktop"`). We can just change all these specific mobile cards to standard transparent divs.

content = content.replace(/<Card className="!border-none !shadow-none bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md rounded-2xl p-4([^"]*)">/g, '<div className="flex flex-col w-full$1">');
content = content.replace(/<Card className="!border-none !shadow-none bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md rounded-2xl p-5([^"]*)">/g, '<div className="flex flex-col w-full gap-3$1">');
content = content.replace(/<\/Card>/g, (match, offset, string) => {
    // Only replace </Card> if we are in the mobile section.
    // Given the structure, we can just replace all </Card> that were previously modified... actually no, replace using matched tags is safer in TS.
    return match; // We'll just replace all these specific <Card...> with <div...>, and then fix the closing tags using typescript AST or simple replacement if we know the structure.
});

fs.writeFileSync('replace_mobile_cards.ts', content);
