const fs = require('fs');
let content = fs.readFileSync('pages/Bio.tsx', 'utf-8');
const getFontSizeClass = `  const getFontSizeClass = (size?: string) => {
    const resolvedSize = size ? (size === "sm" ? "12 pt" : size === "base" ? "14 pt" : size === "lg" ? "16 pt" : size === "xl" ? "24 pt" : size) : "16 pt";
    switch (resolvedSize) {
      case "10 pt": return "text-[10pt]";
      case "12 pt": return "text-[11pt] sm:text-[12pt]";
      case "14 pt": return "text-[12pt] sm:text-[14pt]";
      case "16 pt": return "text-[13pt] sm:text-[16pt]";
      case "18 pt": return "text-[14pt] sm:text-[18pt]";
      case "20 pt": return "text-[15pt] sm:text-[20pt]";
      case "24 pt": return "text-[16pt] sm:text-[24pt]";
      case "28 pt": return "text-[18pt] sm:text-[28pt]";
      case "32 pt": return "text-[20pt] sm:text-[32pt]";
      case "36 pt": return "text-[24pt] sm:text-[36pt]";
      default: return "text-[13pt] sm:text-[16pt]";
    }
  };`;
  
if (content.includes(getFontSizeClass)) {
  content = content.replace(getFontSizeClass, '');
  // Insert at top after imports
  const importEnd = content.lastIndexOf('import ');
  const nextLine = content.indexOf('\n', importEnd) + 1;
  content = content.slice(0, nextLine) + '\n' + getFontSizeClass.replace(/^  /gm, '') + '\n' + content.slice(nextLine);
  fs.writeFileSync('pages/Bio.tsx', content);
  console.log('Moved getFontSizeClass');
} else {
  console.log('Could not find getFontSizeClass');
}
