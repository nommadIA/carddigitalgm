const fs = require('fs');
let content = fs.readFileSync('components/bio/BioRenderer.tsx', 'utf-8');

// 1. Add id="portfolio-section"
const sectionTarget = `          {/* Portfólio Section */}
          {bio.portfolio_items && bio.portfolio_items.length > 0 && (
            <div className="pt-4 space-y-4 relative">`;
const sectionReplace = `          {/* Portfólio Section */}
          {bio.portfolio_items && bio.portfolio_items.length > 0 && (
            <div id="portfolio-section" className="pt-4 space-y-4 relative">`;

if (content.includes(sectionTarget)) {
  content = content.replace(sectionTarget, sectionReplace);
  console.log("Added ID to portfolio section.");
}

// 2. Add button in renderProfileHeader
const headerTarget = `                    {/* Share Bio Button */}
                    <div className="pt-1 flex justify-center">
                      <button 
                        onClick={handleShareBio}`;
const headerReplace = `                    {/* Actions Row */}
                    <div className="pt-1 flex justify-center gap-3">
                      {bio.portfolio_items && bio.portfolio_items.length > 0 && (
                        <button 
                          onClick={() => {
                            const el = document.getElementById("portfolio-section");
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={\`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-extrabold shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 text-white bg-gradient-to-r\`}
                          style={{ 
                            backgroundImage: \`linear-gradient(to right, \${brandColor}, \${brandColor}dd)\`,
                          }}
                        >
                          <Layout className="w-4 h-4" /> Ver Portfólio
                        </button>
                      )}

                      <button 
                        onClick={handleShareBio}`;
if (content.includes(headerTarget)) {
  content = content.replace(headerTarget, headerReplace);
  console.log("Added portfolio button to header.");
}

fs.writeFileSync('components/bio/BioRenderer.tsx', content);
