import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // We need to change the index === X conditions
  // Current 1 (Tema e Estilo) -> 2
  // Current 2 (Pix) -> 3
  // Current 3 (Timbrado) -> 4
  // Current 4 (Fonte do App) -> 5
  // Current 5 (Notificações Push) -> 6
  // Current 6 (Plano de Fundo) -> 1

  // First, let's replace them with temporary markers
  mobileView = mobileView.replace(/\{index === 1 && \(/g, '{index === TEMP_2 && (');
  mobileView = mobileView.replace(/\{index === 2 && \(/g, '{index === TEMP_3 && (');
  mobileView = mobileView.replace(/\{index === 3 && \(/g, '{index === TEMP_4 && (');
  mobileView = mobileView.replace(/\{index === 4 && \(/g, '{index === TEMP_5 && (');
  mobileView = mobileView.replace(/\{index === 5 && \(/g, '{index === TEMP_6 && (');
  mobileView = mobileView.replace(/\{index === 6 && \(/g, '{index === TEMP_1 && (');

  // Now replace temporary markers with actual indices
  mobileView = mobileView.replace(/TEMP_1/g, '1');
  mobileView = mobileView.replace(/TEMP_2/g, '2');
  mobileView = mobileView.replace(/TEMP_3/g, '3');
  mobileView = mobileView.replace(/TEMP_4/g, '4');
  mobileView = mobileView.replace(/TEMP_5/g, '5');
  mobileView = mobileView.replace(/TEMP_6/g, '6');

  content = content.substring(0, startIndex) + mobileView + content.substring(endIndex);
  fs.writeFileSync(filePath, content);
  console.log('Screens reordered successfully');
} else {
  console.log('Could not find mobile view section');
}
