import fs from 'fs';
const file = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(file, 'utf8');

const col3Start = content.indexOf('          {/* =========================\n              COLUNA 3');
const col4Start = content.indexOf('          {/* =========================\n              COLUNA 4');
const colEnd = content.indexOf('        </div>\n    ) : (\n    /* SMARTPHONE CAROUSEL VIEW */');

if (col3Start !== -1 && col4Start !== -1 && colEnd !== -1) {
  const col3 = content.substring(col3Start, col4Start);
  const col4and5 = content.substring(col4Start, colEnd);
  
  const newContent = content.substring(0, col3Start) +
                     col4and5 +
                     '          </div>\n\n          {/* COLUNA DIREITA */}\n          <div className="space-y-4 md:space-y-6">\n' +
                     col3 +
                     '          </div>\n' +
                     content.substring(colEnd);
                     
  fs.writeFileSync(file, newContent);
  console.log('Columns moved successfully!');
} else {
  console.log('Could not find column markers.');
  console.log('col3Start:', col3Start);
  console.log('col4Start:', col4Start);
  console.log('colEnd:', colEnd);
}
