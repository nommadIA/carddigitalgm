import fs from 'fs';

const filePath = 'pages/Configuracoes.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">';
const endMarker = '      )}\n        </div>\n      </div>\n    </Page>\n  );\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let mobileView = content.substring(startIndex, endIndex);

  // We need to completely rewrite the mobile view mapping
  // First, extract the content of each section
  
  const extractSection = (regex: RegExp) => {
    const match = mobileView.match(regex);
    return match ? match[1] : '';
  };

  const personalizacao = extractSection(/\{index === 0 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const planoFundo = extractSection(/\{index === 1 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const temaEstilo = extractSection(/\{index === 2 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const pix = extractSection(/\{index === 3 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const timbrado = extractSection(/\{index === 4 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const fonteApp = extractSection(/\{index === 5 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);
  const push = extractSection(/\{index === 6 && \([\s\S]*?<div className="w-full flex-shrink-0 flex flex-col">([\s\S]*?)<\/div>\n              \)\}/);

  // Remove the fixed height from cards to allow them to flow naturally in the scrollable view
  const removeFixedHeight = (str: string) => str.replace(/h-\[380px\]/g, 'h-auto');

  const newMobileView = `
<div className="lg:hidden w-full max-w-md mx-auto relative flex flex-col pb-24">
          
          <div className="relative overflow-hidden w-full pt-1">
            <motion.div 
              className="relative flex items-start"
              initial={false}
            >
              <motion.div
                className="flex w-full items-start"
                animate={{ x: \`-\${currentScreen * 100}%\` }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              >
                <motion.div
                className="flex w-full items-start"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x * velocity.x;
                    if (offset.x < -50 && currentScreen < 2) {
                      setCurrentScreen(currentScreen + 1);
                    } else if (offset.x > 50 && currentScreen > 0) {
                      setCurrentScreen(currentScreen - 1);
                    }
                  }}
                >
                {[0, 1, 2].map((index) => {
                  const isActive = index === currentScreen;
                  return (
                    <motion.div
                      key={index}
                      className="w-full shrink-0 px-2 flex flex-col justify-start h-[65vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      animate={{ 
                        filter: isActive ? "blur(0px)" : "blur(4px)", 
                        opacity: isActive ? 1 : 0.5,
                        scale: isActive ? 1 : 0.95
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="w-full flex-shrink-0 flex flex-col gap-6 pb-8">
                        {index === 0 && (
                          <>
                            ${removeFixedHeight(personalizacao)}
                            ${removeFixedHeight(planoFundo)}
                            ${removeFixedHeight(temaEstilo)}
                            ${removeFixedHeight(fonteApp)}
                          </>
                        )}
                        {index === 1 && (
                          <>
                            ${removeFixedHeight(pix)}
                            ${removeFixedHeight(timbrado)}
                          </>
                        )}
                        {index === 2 && (
                          <>
                            ${removeFixedHeight(push)}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* PAGINATION DOTS - RELATIVE POSITION */}
          <div className="flex justify-center mt-2 mb-6 z-[110] pointer-events-none">
            <div className="flex gap-1.5 pointer-events-auto">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentScreen ? 1 : -1);
                    setCurrentScreen(idx);
                  }}
                  className={\`h-1 rounded-full transition-all duration-300 \${
                    idx === currentScreen ? "w-4 bg-[#ff6600] shadow-[0_0_8px_#ff6600]" : "w-1 bg-white/50"
                  }\`}
                />
              ))}
            </div>
          </div>
        </div>
`;

  content = content.substring(0, startIndex) + newMobileView.trim() + '\n' + content.substring(endIndex);
  
  // Also need to fix the drag logic in the component
  // We already updated the drag logic in the newMobileView string (currentScreen < 2)
  
  fs.writeFileSync(filePath, content);
  console.log('Mobile view refactored to 3 screens');
} else {
  console.log('Could not find mobile view section');
}
