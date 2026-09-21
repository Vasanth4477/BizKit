const fs=require('fs');
const server=fs.readFileSync('server.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const router=fs.readFileSync('app-router.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

const requiredServer=[
  'DATABASE_URL','pg','/api/integrations/razorpay/payment-link',
  'CREATE TABLE IF NOT EXISTS payments',
  'ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS currency',
  'CREATE TABLE IF NOT EXISTS stock_movements',
  '/api/health','const PAGE_FILES','withTransaction',
  'Insufficient stock','Payment exceeds the remaining invoice balance',
  '/api/payments/:id/reverse','/api/purchases/:id',
  '/api/purchases/:id/cancel','/api/suppliers/:id',
  'convert-to-invoice','APP_TIMEZONE','dateValue','numberValue','idValue','password_reset_tokens','password_version','authLimiter','resetLimiter','Strict-Transport-Security','Permissions-Policy','X-Request-Id','Cache-Control','trust proxy','SIGTERM','SIGINT','shuttingDown'
];
for(const x of requiredServer) if(!server.includes(x)) throw Error('Missing server feature: '+x);

for(const x of ['app-router.js','pages/home.html','pages/invoices.html','pages/invoice-new.html','pages/integrations.html','migrations/001_qa_hardening.sql'])
  if(!fs.existsSync(x)) throw Error('Missing asset: '+x);

if(server.includes('better-sqlite3')) throw Error('SQLite still present');
if(server.includes('2406:')) throw Error('Hard-coded IPv6 found');

for(const [file,src] of [['app.js',app],['app-router.js',router],['server.js',server]]){
  try{new Function(src)}catch(e){throw Error('Syntax error in '+file+': '+e.message)}
}

if(pkg.version!=='0.8.0') throw Error('Package version mismatch');

for(const x of [
  'editCustomer','editProduct','editPurchase','editSupplier','deleteSupplier',
  'reversePayment','convertQuotationToInvoice','paymentTotal','exportTable',
  'exportReport','resetQuoteModal','resetPaymentModal','todayISO','dateAfterISO','changePassword'
]) if(!app.includes(x)) throw Error('Missing frontend workflow: '+x);

for(const x of [
  'customerOptions','purchaseProductOptions','invoiceBuilder','purchaseModalTitle',
  'supplierModalTitle','purchaseSaveBtn','supplierSaveBtn','updateQuoteSummary',
  'updatePurchaseSummary','invoiceDeleteBtn','printInclude','inv_qty','q_qty','forgot-password','reset-password','security_current','security_new','security_confirm','privacy','terms','refund'
]) if(!router.includes(x)) throw Error('Missing workflow UI: '+x);

if((router.match(/function initInvoiceBuilder\(/g)||[]).length!==1) throw Error('Expected exactly one invoice builder initializer');
if((app.match(/\bqsa\s*=\s*s=>/g)||[]).length!==1) throw Error('Expected exactly one qsa helper');
if((app.match(/\$\$/g)||[]).length) throw Error('Broken $$ helper remains');
if((router.match(/new Date\(\)\.toISOString\(\)\.slice\(0,10\)/g)||[]).length) throw Error('UTC date defaults remain');
if(!server.includes("app.post('/api/auth/forgot-password',resetLimiter")||!server.includes("app.post('/api/auth/reset-password',resetLimiter")||!server.includes("app.post('/api/auth/change-password',auth,resetLimiter")) throw Error('Password security routes are not rate limited');
if(!server.includes('password_version=password_version+1')) throw Error('Password changes do not revoke older sessions');
if(server.includes("res.json({token,resetToken")) throw Error('Reset token appears to be returned directly');
if(!server.includes("/privacy':'privacy.html")||!server.includes("/forgot-password':'forgot-password.html")) throw Error('Phase 4 page routing incomplete');
if(!server.includes("'password_reset_tokens'")) throw Error('Health readiness does not include reset-token storage');
if(!server.includes('tableCount!==expected.length||cols!==6')) throw Error('Health readiness column checks are incomplete');
if(!server.includes("res.setHeader('Cache-Control','no-store')")) throw Error('API responses are not marked no-store');

const apiRoutes=[...server.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/g)];
for(const m of apiRoutes){
  const path=m[2];
  if(path.startsWith('/api/') && !['/api/auth/signup','/api/auth/login','/api/health'].includes(path)){
    const start=server.lastIndexOf('\n',server.lastIndexOf(m[0]))+1;
  }
}

const constraints=server.includes('reversed_at IS NULL') &&
  server.includes('Stock tracking cannot be disabled after inventory history exists') &&
  server.includes('Due date cannot be before invoice date') &&
  server.includes('Valid-until date cannot be before quotation date') &&
  server.includes('Invoices with payment history cannot be deleted');
if(!constraints) throw Error('Core integrity hardening missing');

console.log('BizKit 0.8.0 phase 4 production-readiness smoke test passed.');
