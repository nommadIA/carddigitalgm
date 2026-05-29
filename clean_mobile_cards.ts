import * as fs from 'fs';

let content = fs.readFileSync('pages/Configuracoes.tsx', 'utf-8');

// The mobile section starts after `<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full min-h-0 bg-transparent">`

const mobileStart = content.indexOf('<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col h-full min-h-0 bg-transparent">');

if (mobileStart > -1) {
    let desktopContent = content.substring(0, mobileStart);
    let mobileContent = content.substring(mobileStart);

    // Replace <Card ...> with <div ...> and </Card> with </div> in the mobile content
    mobileContent = mobileContent.replace(/<Card className="!border-none !shadow-none bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md rounded-2xl p-4([^"]*)">/g, '<div className="flex flex-col w-full py-2$1">');
    mobileContent = mobileContent.replace(/<Card className="!border-none !shadow-none bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md rounded-2xl p-5([^"]*)">/g, '<div className="flex flex-col w-full py-2$1">');
    
    // There's also `rounded-2xl p-4 relative overflow-hidden flex flex-col items-center justify-center text-center h-auto min-h-[280px]`
    
    // To safely replace `</Card>` only where we replaced `<Card>`, it's easier to just replace ALL `Card` in mobileContent, since mobileContent may not need `Card` at all.
    // Let's check how many Cards are in mobileContent.
    
    mobileContent = mobileContent.replace(/<Card/g, '<div');
    mobileContent = mobileContent.replace(/<\/Card>/g, '</div>');

    content = desktopContent + mobileContent;
    fs.writeFileSync('pages/Configuracoes.tsx', content);
    console.log("Successfully replaced mobile cards with divs");
} else {
    console.log("Could not find mobile section start");
}
