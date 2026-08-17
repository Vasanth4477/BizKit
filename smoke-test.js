const fs=require('fs');const s=fs.readFileSync('server.js','utf8');
for(const x of ['JWT_SECRET','/api/auth/signup','/api/customers','/api/products','/api/expenses','/api/invoices','/api/quotations','/api/dashboard','app.get("/{*splat}"']) if(!s.includes(x)) throw new Error('Missing '+x);
console.log('BizKit smoke test passed.');
