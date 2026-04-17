import fs from "fs";
const file = "./pages/Dashboard.tsx";
let code = fs.readFileSync(file, "utf8");
code = code.replace(/bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md/g, "");
fs.writeFileSync(file, code);
