const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) { console.error("JWT_SECRET must be set and at least 32 characters long."); process.exit(1); }
const fs = require("fs");
const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "bizkit.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  sku TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS business_profiles (
  user_id INTEGER PRIMARY KEY,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);


db.exec(`
CREATE TABLE IF NOT EXISTS quotations (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,quote_no TEXT NOT NULL,quote_date TEXT,valid_until TEXT,customer_name TEXT,customer_address TEXT,gst_rate REAL DEFAULT 0,discount REAL DEFAULT 0,items_json TEXT DEFAULT '[]',subtotal REAL DEFAULT 0,gst_amount REAL DEFAULT 0,total REAL DEFAULT 0,status TEXT DEFAULT 'draft',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,invoice_no TEXT NOT NULL,invoice_date TEXT,due_date TEXT,customer_name TEXT,customer_address TEXT,gst_rate REAL DEFAULT 0,discount REAL DEFAULT 0,items_json TEXT DEFAULT '[]',subtotal REAL DEFAULT 0,gst_amount REAL DEFAULT 0,total REAL DEFAULT 0,status TEXT DEFAULT 'unpaid',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
`);
app.use((req,res,next)=>{res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");next();});
app.use(express.json({limit:"1mb"}));
app.use(express.static(__dirname));

function tokenFor(user){ return jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:"7d"}); }
function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Authentication required"});
  try { req.user=jwt.verify(h.slice(7),JWT_SECRET); next(); }
  catch { res.status(401).json({error:"Invalid or expired session"}); }
}

app.post("/api/auth/signup", async (req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name||!email||!password) return res.status(400).json({error:"Name, email and password are required"});
  if(password.length<6) return res.status(400).json({error:"Password must contain at least 6 characters"});
  const normalized=email.trim().toLowerCase();
  try{
    const hash=await bcrypt.hash(password,12);
    const info=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name.trim(),normalized,hash);
    db.prepare("INSERT INTO business_profiles(user_id,business_name,email) VALUES(?,?,?)").run(info.lastInsertRowid,name.trim(),normalized);
    const user={id:info.lastInsertRowid,name:name.trim(),email:normalized};
    res.json({token:tokenFor(user),user});
  }catch(e){
    if(String(e).includes("UNIQUE")) return res.status(409).json({error:"An account with that email already exists"});
    res.status(500).json({error:"Could not create account"});
  }
});

app.post("/api/auth/login", async (req,res)=>{
  const {email,password}=req.body||{};
  const user=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").trim().toLowerCase());
  if(!user || !(await bcrypt.compare(password||"",user.password_hash))) return res.status(401).json({error:"Email or password is incorrect"});
  res.json({token:tokenFor(user),user:{id:user.id,name:user.name,email:user.email}});
});

app.get("/api/me",auth,(req,res)=>{
  const user=db.prepare("SELECT id,name,email,created_at FROM users WHERE id=?").get(req.user.id);
  res.json({user});
});

app.get("/api/customers",auth,(req,res)=>res.json({customers:db.prepare("SELECT id,name,phone,email FROM customers WHERE user_id=? ORDER BY id DESC").all(req.user.id)}));
app.post("/api/customers",auth,(req,res)=>{
  const {name,phone="",email=""}=req.body||{};
  if(!name) return res.status(400).json({error:"Customer name is required"});
  const info=db.prepare("INSERT INTO customers(user_id,name,phone,email) VALUES(?,?,?,?)").run(req.user.id,name,phone,email);
  res.status(201).json({customer:{id:info.lastInsertRowid,name,phone,email}});
});
app.delete("/api/customers/:id",auth,(req,res)=>{
  db.prepare("DELETE FROM customers WHERE id=? AND user_id=?").run(req.params.id,req.user.id); res.json({ok:true});
});

app.get("/api/products",auth,(req,res)=>res.json({products:db.prepare("SELECT id,name,price,sku FROM products WHERE user_id=? ORDER BY id DESC").all(req.user.id)}));
app.post("/api/products",auth,(req,res)=>{
  const {name,price=0,sku=""}=req.body||{};
  if(!name) return res.status(400).json({error:"Product/service name is required"});
  const info=db.prepare("INSERT INTO products(user_id,name,price,sku) VALUES(?,?,?,?)").run(req.user.id,name,Number(price)||0,sku);
  res.status(201).json({product:{id:info.lastInsertRowid,name,price:Number(price)||0,sku}});
});
app.delete("/api/products/:id",auth,(req,res)=>{
  db.prepare("DELETE FROM products WHERE id=? AND user_id=?").run(req.params.id,req.user.id); res.json({ok:true});
});

app.get("/api/profile",auth,(req,res)=>{
  const profile=db.prepare("SELECT business_name as businessName,phone,email,gstin,address FROM business_profiles WHERE user_id=?").get(req.user.id)||{};
  res.json({profile});
});
app.put("/api/profile",auth,(req,res)=>{
  const {businessName="",phone="",email="",gstin="",address=""}=req.body||{};
  db.prepare(`INSERT INTO business_profiles(user_id,business_name,phone,email,gstin,address)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,phone=excluded.phone,email=excluded.email,gstin=excluded.gstin,address=excluded.address`)
    .run(req.user.id,businessName,phone,email,gstin,address);
  res.json({profile:{businessName,phone,email,gstin,address}});
});


function docCalc(b){const items=Array.isArray(b.items)?b.items.map(x=>({name:String(x.name||"Item"),qty:Number(x.qty)||0,rate:Number(x.rate)||0,amount:(Number(x.qty)||0)*(Number(x.rate)||0)})):[];const subtotal=items.reduce((a,x)=>a+x.amount,0),discount=Math.max(0,Number(b.discount)||0),gstRate=Math.max(0,Number(b.gstRate)||0),taxable=Math.max(0,subtotal-discount),gstAmount=taxable*gstRate/100;return{items,subtotal,discount,gstRate,gstAmount,total:taxable+gstAmount};}
app.get("/api/quotations",auth,(req,res)=>res.json({quotations:db.prepare("SELECT * FROM quotations WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(r=>({...r,items:JSON.parse(r.items_json)}))}));
app.post("/api/quotations",auth,(req,res)=>{const q=req.body||{},c=docCalc(q),i=db.prepare("INSERT INTO quotations(user_id,quote_no,quote_date,valid_until,customer_name,customer_address,gst_rate,discount,items_json,subtotal,gst_amount,total,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(req.user.id,q.quoteNo||"QUO-001",q.quoteDate||"",q.validUntil||"",q.customerName||"",q.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,q.status||"draft");res.status(201).json({id:i.lastInsertRowid});});
app.delete("/api/quotations/:id",auth,(req,res)=>{db.prepare("DELETE FROM quotations WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true});});
app.get("/api/invoices",auth,(req,res)=>res.json({invoices:db.prepare("SELECT * FROM invoices WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(r=>({...r,items:JSON.parse(r.items_json)}))}));
app.post("/api/invoices",auth,(req,res)=>{const q=req.body||{},c=docCalc(q),i=db.prepare("INSERT INTO invoices(user_id,invoice_no,invoice_date,due_date,customer_name,customer_address,gst_rate,discount,items_json,subtotal,gst_amount,total,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(req.user.id,q.invoiceNo||"INV-001",q.invoiceDate||"",q.dueDate||"",q.customerName||"",q.customerAddress||"",c.gstRate,c.discount,JSON.stringify(c.items),c.subtotal,c.gstAmount,c.total,q.status||"unpaid");res.status(201).json({id:i.lastInsertRowid});});
app.patch("/api/invoices/:id/status",auth,(req,res)=>{const status=["unpaid","paid","overdue","cancelled"].includes(req.body?.status)?req.body.status:"unpaid";db.prepare("UPDATE invoices SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").run(status,req.params.id,req.user.id);res.json({ok:true});});
app.delete("/api/invoices/:id",auth,(req,res)=>{db.prepare("DELETE FROM invoices WHERE id=? AND user_id=?").run(req.params.id,req.user.id);res.json({ok:true});});
app.get("/api/dashboard",auth,(req,res)=>{const inv=db.prepare("SELECT status,total FROM invoices WHERE user_id=?").all(req.user.id),customers=db.prepare("SELECT COUNT(*) c FROM customers WHERE user_id=?").get(req.user.id).c,products=db.prepare("SELECT COUNT(*) c FROM products WHERE user_id=?").get(req.user.id).c;res.json({customers,products,invoices:inv.length,revenue:inv.filter(x=>x.status==="paid").reduce((a,x)=>a+x.total,0),outstanding:inv.filter(x=>x.status==="unpaid"||x.status==="overdue").reduce((a,x)=>a+x.total,0)});});

app.get("/api/health",(req,res)=>res.json({ok:true,service:"BizKit API"}));

app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));

app.listen(PORT,()=>console.log(`BizKit running on http://localhost:${PORT}`));
