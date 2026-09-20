const fs=require('fs');
const server=fs.readFileSync('server.js','utf8');
const requiredServer=['DATABASE_URL','pg','/api/integrations/razorpay/payment-link','CREATE TABLE IF NOT EXISTS payments','ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS currency','CREATE TABLE IF NOT EXISTS stock_movements','/api/health','const PAGE_FILES','withTransaction','Insufficient stock','Payment exceeds the remaining invoice balance','/api/payments/:id/reverse','/api/purchases/:id','/api/purchases/:id/cancel','/api/suppliers/:id','convert-to-invoice'];
for(const x of requiredServer) if(!server.includes(x)) throw Error('Missing server feature: '+x);
for(const x of ['app-router.js','pages/home.html','pages/invoices.html','pages/invoice-new.html','pages/integrations.html']) if(!fs.existsSync(x)) throw Error('Missing page asset: '+x);
if(server.includes('better-sqlite3')) throw Error('SQLite still present');
if(server.includes('2406:')) throw Error('Hard-coded IPv6 found');
if(server.includes("version:'0.6.1'")) throw Error('Stale server version remains');
for(const file of ['app.js','app-router.js','server.js']){const src=fs.readFileSync(file,'utf8');try{new Function(src)}catch(e){throw Error('Syntax error in '+file+': '+e.message)}}
const app=fs.readFileSync('app.js','utf8'),router=fs.readFileSync('app-router.js','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));if(pkg.version!=='0.7.2') throw Error('Package version mismatch');
for(const x of ['editCustomer','editProduct','editPurchase','editSupplier','deleteSupplier','reversePayment','convertQuotationToInvoice','paymentTotal']) if(!app.includes(x)) throw Error('Missing workflow UX: '+x);
for(const x of ['customerOptions','purchaseProductOptions','invoiceBuilder','purchaseModalTitle','supplierModalTitle','purchaseSaveBtn','supplierSaveBtn','updateQuoteSummary','updatePurchaseSummary']) if(!router.includes(x)) throw Error('Missing workflow UI: '+x);
const initCount=(router.match(/function initInvoiceBuilder\(/g)||[]).length;if(initCount!==1) throw Error('Expected exactly one invoice builder initializer');
console.log('BizKit Phase 3 smoke test passed.');
