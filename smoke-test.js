const fs=require('fs');
const server=fs.readFileSync('server.js','utf8');
const requiredServer=['DATABASE_URL','pg','/api/integrations/razorpay/payment-link','CREATE TABLE IF NOT EXISTS payments','CREATE TABLE IF NOT EXISTS stock_movements','/api/health','const PAGE_FILES'];
for(const x of requiredServer) if(!server.includes(x)) throw Error('Missing server feature: '+x);
for(const x of ['app-router.js','pages/home.html','pages/invoices.html','pages/invoice-new.html','pages/integrations.html']) if(!fs.existsSync(x)) throw Error('Missing page asset: '+x);
if(server.includes('better-sqlite3')) throw Error('SQLite still present');
if(server.includes('2406:')) throw Error('Hard-coded IPv6 found');
console.log('BizKit multipage smoke test passed.');
