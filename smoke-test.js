const fs=require("fs");
const s=fs.readFileSync("server.js","utf8");
if(!s.includes('app.get("/{*splat}"')) throw new Error("Express 5 fallback missing");
if(!s.includes('/api/health')) throw new Error("Health endpoint missing");
if(!s.includes('bcrypt.hash')) throw new Error("Password hashing missing");
if(!s.includes('jwt.sign')) throw new Error("JWT missing");
console.log("BizKit server smoke checks passed.");
