const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set and at least 32 characters long.");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "bizkit.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS business_profiles(
  user_id INTEGER PRIMARY KEY,
  business_name TEXT,
  business_type TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  state TEXT,
  logo_url TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS customers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  hsn_sac TEXT,
  price REAL NOT NULL DEFAULT 0,
  purchase_price REAL NOT NULL DEFAULT 0,
  gst_rate REAL NOT NULL DEFAULT 18,
  stock REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 5,
  track_stock INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS invoices(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  invoice_no TEXT NOT NULL,
  invoice_date TEXT,
  due_date TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  gst_rate REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  gst_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quotations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quote_no TEXT NOT NULL,
  quote_date TEXT,
  valid_until TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  gst_rate REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  gst_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS expenses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  expense_date TEXT,
  category TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options","SAMEORIGIN");
  next();
});
app.use(express.json({limit:"1mb"}));
app.use(express.static(__dirname));

const normalizeEmail = e => String(e||"").trim().toLowerCase();
const tokenFor = user => jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:"7d"});
function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Authentication required"});
  try{ req.user=jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch{ res.status(401).json({error:"Invalid or expired session"}); }
}
function calcDoc(body){
  const items=Array.isArray(body.items)?body.items.map(x=>({
    productId:x.productId||null,
    name:String(x.name||"Item"),
    qty:Number(x.qty)||0,
    rate:Number(x.rate)||0,
    gstRate:Number(x.gstRate ?? body.gstRate ?? 0)||0,
    amount:(Number(x.qty)||0)*(Number(x.rate)||0)
  })):[];
  const subtotal=items.reduce((a,x)=>a+x.amount,0);
  const discount=Math.max(0,Number(body.discount)||0);
  const gstRate=Math.max(0,Number(body.gstRate)||0);
  const taxable=Math.max(0,subtotal-discount);
  const gstAmount=taxable*gstRate/100;
  return {items,subtotal,discount,gstRate,gstAmount,total:taxable+gstAmount};
}
function dateISO(d=new Date()){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }

/* Auth */
app.post("/api/auth/signup", async (req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name||!email||!password) return res.status(400).json({error:"Name, email and password are required"});
  if(password.length<6) return res.status(400).json({error:"Password must contain at least 6 characters"});
  const em=normalizeEmail(email);
  try{
    const hash=await bcrypt.hash(password,12);
    const info=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(String(name).trim(),em,hash);
    db.prepare("INSERT INTO business_profiles(user_id,business_name,email) VALUES(?,?,?)").run(info.lastInsertRowid,String(name).trim(),em);
    const user={id:Number(info.lastInsertRowid),name:String(name).trim(),email:em};
    res.status(201).json({user,token:tokenFor(user)});
  }catch(e){
    if(String(e).includes("UNIQUE")) return res.status(409).json({error:"An account with this email already exists"});
    res.status(500).json({error:"Could not create account"});
  }
});
app.post("/api/auth/login", async (req,res)=>{
  const em=normalizeEmail(req.body?.email), password=req.body?.password||"";
  const u=db.prepare("SELECT * FROM users WHERE email=?").get(em);
  if(!u || !(await bcrypt.compare(password,u.password_hash))) return res.status(401).json({error:"Email or password is incorrect"});
  const user={id:u.id,name:u.name,email:u.email};
  res.json({user,token:tokenFor(user)});
});
app.get("/api/me",auth,(req,res)=>res.json({user:db.prepare("SELECT id,name,email,created_at FROM users WHERE id=?").get(req.user.id)}));

/* Profile */
app.get("/api/profile",auth,(req,res)=>{
  const p=db.prepare("SELECT business_name as businessName,business_type as businessType,phone,email,gstin,address,state,logo_url as logoUrl FROM business_profiles WHERE user_id=?").get(req.user.id)||{};
  res.json({profile:p});
});
app.put("/api/profile",auth,(req,res)=>{
  const p=req.body||{};
  db.prepare(`INSERT INTO business_profiles(user_id,business_name,business_type,phone,email,gstin,address,state,logo_url)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,business_type=excluded.business_type,phone=excluded.phone,email=excluded.email,gstin=excluded.gstin,address=excluded.address,state=excluded.state,logo_url=excluded.logo_url`)
    .run(req.user.id,p.businessName||"",p.businessType||"",p.phone||"",p.email||"",p.gstin||"",p.address||"",p.state||"",p.logoUrl||"");
  res.json({ok:true});
});

/* Customers */
app.get("/api/customers",auth,(req,res)=>res.json({customers:db.prepare("SELECT * FROM customers WHERE user_id=? ORDER BY id DESC").all(req.user.id)}));
app.post("/api/customers",auth,(req,res)=>{
  const b=req.body||{}; if(!b.name) return res.status(400).json({error:"Customer name is required"});
  const i=db.prepare("INSERT INTO customers(user_id,name,phone,email,address,notes) VALUES(?,?,?,?,?,?)").run(req.user.id,b.name,b.phone||"",b.email||"",b.address||"",b.notes||"");
  res.status(201).json({id:i.lastInsertRowid});
});
app.put("/api/customers/:id",auth,(req,res)=>{
  const b=req.body||{}; const r=db.prepare("UPDATE customers SET name=?,phone=?,email=?,address=?,notes=? WHERE id=? AND user_id=?").run(b.name,b.phone||"",b.email||"",b.address||"",b.notes||"",req.params.id,req.user.id);
  if(!r.changes) return res.status(404).json({error:"Customer not found"});
  res.json({ok:true});
});
app.delete("/api/customers/:id",auth,(req,res)=>{db.prepare("DELETE FROM customers WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true})});

/* Products / inventory */
app.get("/api/products",auth,(req,res)=>res.json({products:db.prepare("SELECT * FROM products WHERE user_id=? ORDER BY id DESC").all(req.user.id)}));
app.post("/api/products",auth,(req,res)=>{
  const b=req.body||{}; if(!b.name) return res.status(400).json({error:"Product/service name is required"});
  const i=db.prepare(`INSERT INTO products(user_id,name,sku,hsn_sac,price,purchase_price,gst_rate,stock,low_stock_threshold,track_stock)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(req.user.id,b.name,b.sku||"",b.hsnSac||"",Number(b.price)||0,Number(b.purchasePrice)||0,Number(b.gstRate)||18,Number(b.stock)||0,Number(b.lowStockThreshold)||5,b.trackStock===false?0:1);
  res.status(201).json({id:i.lastInsertRowid});
});
app.put("/api/products/:id",auth,(req,res)=>{
  const b=req.body||{}; const r=db.prepare(`UPDATE products SET name=?,sku=?,hsn_sac=?,price=?,purchase_price=?,gst_rate=?,stock=?,low_stock_threshold=?,track_stock=? WHERE id=? AND user_id=?`)
    .run(b.name,b.sku||"",b.hsnSac||"",Number(b.price)||0,Number(b.purchasePrice)||0,Number(b.gstRate)||18,Number(b.stock)||0,Number(b.lowStockThreshold)||5,b.trackStock===false?0:1,req.params.id,req.user.id);
  if(!r.changes)return res.status(404).json({error:"Product not found"});res.json({ok:true});
});
app.delete("/api/products/:id",auth,(req,res)=>{db.prepare("DELETE FROM products WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true})});

/* Expenses */
app.get("/api/expenses",auth,(req,res)=>res.json({expenses:db.prepare("SELECT * FROM expenses WHERE user_id=? ORDER BY id DESC").all(req.user.id)}));
app.post("/api/expenses",auth,(req,res)=>{
  const b=req.body||{};if(!b.category||!(Number(b.amount)>0))return res.status(400).json({error:"Category and amount are required"});
  const i=db.prepare("INSERT INTO expenses(user_id,expense_date,category,amount,note) VALUES(?,?,?,?,?)").run(req.user.id,b.expenseDate||dateISO(),b.category,Number(b.amount)||0,b.note||"");
  res.status(201).json({id:i.lastInsertRowid});
});
app.delete("/api/expenses/:id",auth,(req,res)=>{db.prepare("DELETE FROM expenses WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true})});

/* Invoices */
app.get("/api/invoices",auth,(req,res)=>res.json({invoices:db.prepare("SELECT * FROM invoices WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(r=>({...r,items:JSON.parse(r.items_json)}))}));
app.post("/api/invoices",auth,(req,res)=>{
  const b=req.body||{}, c=calcDoc(b);
  const i=db.prepare(`INSERT INTO invoices(user_id,invoice_no,invoice_date,due_date,customer_id,customer_name,customer_phone,customer_address,gst_rate,discount,items_json,subtotal,gst_amount,total,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.id,b.invoiceNo||"INV-001",b.invoiceDate||dateISO(),b.dueDate||"",b.customerId||null,b.customerName||"",b.customerPhone||"",b.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,b.status||"unpaid");
  // Reduce tracked product stock.
  for(const it of c.items){ if(it.productId){ db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND user_id=? AND track_stock=1").run(it.qty,it.productId,req.user.id); } }
  res.status(201).json({id:i.lastInsertRowid,total:c.total});
});
app.put("/api/invoices/:id",auth,(req,res)=>{
  const b=req.body||{},c=calcDoc(b);
  const r=db.prepare(`UPDATE invoices SET invoice_no=?,invoice_date=?,due_date=?,customer_id=?,customer_name=?,customer_phone=?,customer_address=?,gst_rate=?,discount=?,items_json=?,subtotal=?,gst_amount=?,total=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?`)
    .run(b.invoiceNo||"INV-001",b.invoiceDate||"",b.dueDate||"",b.customerId||null,b.customerName||"",b.customerPhone||"",b.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,b.status||"unpaid",req.params.id,req.user.id);
  if(!r.changes)return res.status(404).json({error:"Invoice not found"});res.json({ok:true});
});
app.patch("/api/invoices/:id/status",auth,(req,res)=>{
  const allowed=["unpaid","paid","overdue","cancelled","partial"];const status=allowed.includes(req.body?.status)?req.body.status:"unpaid";
  db.prepare("UPDATE invoices SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").run(status,req.params.id,req.user.id);res.json({ok:true});
});
app.delete("/api/invoices/:id",auth,(req,res)=>{db.prepare("DELETE FROM invoices WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true})});

/* Quotations */
app.get("/api/quotations",auth,(req,res)=>res.json({quotations:db.prepare("SELECT * FROM quotations WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(r=>({...r,items:JSON.parse(r.items_json)}))}));
app.post("/api/quotations",auth,(req,res)=>{
  const b=req.body||{},c=calcDoc(b);
  const i=db.prepare(`INSERT INTO quotations(user_id,quote_no,quote_date,valid_until,customer_id,customer_name,customer_phone,customer_address,gst_rate,discount,items_json,subtotal,gst_amount,total,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.id,b.quoteNo||"QUO-001",b.quoteDate||dateISO(),b.validUntil||"",b.customerId||null,b.customerName||"",b.customerPhone||"",b.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,b.status||"draft");
  res.status(201).json({id:i.lastInsertRowid,total:c.total});
});
app.put("/api/quotations/:id",auth,(req,res)=>{
  const b=req.body||{},c=calcDoc(b);
  const r=db.prepare(`UPDATE quotations SET quote_no=?,quote_date=?,valid_until=?,customer_id=?,customer_name=?,customer_phone=?,customer_address=?,gst_rate=?,discount=?,items_json=?,subtotal=?,gst_amount=?,total=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?`)
    .run(b.quoteNo||"QUO-001",b.quoteDate||"",b.validUntil||"",b.customerId||null,b.customerName||"",b.customerPhone||"",b.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,b.status||"draft",req.params.id,req.user.id);
  if(!r.changes)return res.status(404).json({error:"Quotation not found"});res.json({ok:true});
});
app.delete("/api/quotations/:id",auth,(req,res)=>{db.prepare("DELETE FROM quotations WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true})});

/* Dashboard + reports */
app.get("/api/dashboard",auth,(req,res)=>{
  const invoices=db.prepare("SELECT status,total FROM invoices WHERE user_id=?").all(req.user.id);
  const expenses=db.prepare("SELECT amount FROM expenses WHERE user_id=?").all(req.user.id);
  const products=db.prepare("SELECT stock,low_stock_threshold,track_stock FROM products WHERE user_id=?").all(req.user.id);
  const customers=db.prepare("SELECT COUNT(*) c FROM customers WHERE user_id=?").get(req.user.id).c;
  const revenue=invoices.filter(x=>x.status==="paid").reduce((a,x)=>a+x.total,0);
  const outstanding=invoices.filter(x=>["unpaid","overdue","partial"].includes(x.status)).reduce((a,x)=>a+x.total,0);
  const totalExpenses=expenses.reduce((a,x)=>a+x.amount,0);
  const lowStock=products.filter(x=>x.track_stock&&x.stock<=x.low_stock_threshold).length;
  res.json({customers,products:products.length,invoices:invoices.length,revenue,outstanding,totalExpenses,profitEstimate:revenue-totalExpenses,lowStock});
});
app.get("/api/reports/monthly",auth,(req,res)=>{
  const invoices=db.prepare(`SELECT substr(invoice_date,1,7) month,status,total FROM invoices WHERE user_id=? ORDER BY month DESC`).all(req.user.id);
  const expenses=db.prepare(`SELECT substr(expense_date,1,7) month, SUM(amount) total FROM expenses WHERE user_id=? GROUP BY month ORDER BY month DESC`).all(req.user.id);
  res.json({invoices,expenses});
});
app.get("/api/health",(req,res)=>res.json({ok:true,service:"BizKit",version:"0.3.0"}));

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log(`BizKit running on port ${PORT}`));
