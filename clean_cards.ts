import fs from "fs";
const file = "./pages/Dashboard.tsx";
let code = fs.readFileSync(file, "utf8");
code = code.replace(/!border-none !shadow-none/g, "");
code = code.replace(/hover:bg-white\/90 dark:hover:bg-slate-700\/90/g, "");
fs.writeFileSync(file, code);
