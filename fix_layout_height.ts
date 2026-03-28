import fs from 'fs';

const layoutPath = 'components/ui/Layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

layoutContent = layoutContent.replace(
  '<div className="gm-container">{children}</div>',
  '<div className="gm-container h-full flex flex-col">{children}</div>'
);

fs.writeFileSync(layoutPath, layoutContent);

const pagePath = 'components/ui/Page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

pageContent = pageContent.replace(
  '<div className="animate-fade-in">',
  '<div className="animate-fade-in h-full flex flex-col">'
);

pageContent = pageContent.replace(
  '{children}',
  '<div className="flex-1 min-h-0 flex flex-col">{children}</div>'
);

fs.writeFileSync(pagePath, pageContent);
console.log('Updated Layout and Page to support full height flex');
