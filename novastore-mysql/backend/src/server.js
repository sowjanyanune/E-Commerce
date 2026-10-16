import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { pool } from './db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random string at least 32 characters long');
const app = express();
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to NovaStore Backend API",
    status: "running"
  });
});
app.disable('x-powered-by');
app.use(express.json({limit:'40kb'}));
app.use(cookieParser());
const asId = value => { const n=Number(value); return Number.isSafeInteger(n)&&n>0?n:null; };
const fail = (res,status,message) => res.status(status).json({error:message});
const isValidEmail = e => typeof e==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length<=255;
const wrap = handler => (req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);
const publicUser = u => ({ id:u.id, name:u.name, email:u.email, role:u.role });
function auth(req,res,next) {
  try { const token = req.cookies.session; if(!token) return fail(res,401,'Please log in'); req.user = jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']}); next(); }
  catch { return fail(res,401,'Your session has expired. Please log in'); }
}
const admin = (req,res,next) => req.user.role==='admin'?next():fail(res,403,'Admin access required');
const setSession = (res,user) => res.cookie('session',jwt.sign(publicUser(user),process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'7d'}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000,path:'/'});
app.get('/api/health',wrap(async(req,res)=>{ await pool.query('SELECT 1'); res.json({ok:true}); }));
app.post('/api/auth/register',wrap(async(req,res)=>{
 const {name,email,password}=req.body;
 if(typeof name!=='string'||!name.trim()||name.length>100||!isValidEmail(email)||typeof password!=='string'||password.length<8||password.length>72) return fail(res,400,'Enter a name, valid email, and password (8–72 characters)');
 const hash=await bcrypt.hash(password,12);
 try { const [result]=await pool.execute('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',[name.trim(),email.toLowerCase().trim(),hash]); const [[user]]=await pool.execute('SELECT id,name,email,role FROM users WHERE id=?',[result.insertId]); setSession(res,user); res.status(201).json({user:publicUser(user)}); }
 catch(err){if(err.code==='ER_DUP_ENTRY') return fail(res,409,'Email already registered'); throw err;}
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const {email,password}=req.body;
 if(!isValidEmail(email)||typeof password!=='string') return fail(res,400,'Invalid credentials');
 const [rows]=await pool.execute('SELECT * FROM users WHERE email=?',[email.toLowerCase().trim()]);
 if(!rows.length||!await bcrypt.compare(password,rows[0].password_hash)) return fail(res,401,'Invalid email or password');
 setSession(res,rows[0]);res.json({user:publicUser(rows[0])});
}));
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('session',{path:'/',sameSite:'lax',secure:process.env.NODE_ENV==='production'});res.json({ok:true});});
app.get('/api/auth/me',wrap(async(req,res)=>{
 try { const session=jwt.verify(req.cookies.session,process.env.JWT_SECRET,{algorithms:['HS256']}); const [rows]=await pool.execute('SELECT id,name,email,role FROM users WHERE id=?',[session.id]); if(rows[0])return res.json({user:rows[0]}); } catch {} return res.json({user:null});
}));
app.get('/api/products',wrap(async(req,res)=>{
 const search=typeof req.query.search==='string'?req.query.search.slice(0,100):'';
const [rows] = await pool.execute(
  'SELECT id,name,description,category,image_url,price,stock FROM products WHERE is_active=TRUE AND (name LIKE ? OR category LIKE ?) ORDER BY id DESC LIMIT 100',
  [`%${search}%`, `%${search}%`]
); res.json({products:rows});
}));
app.get('/api/admin/products',auth,admin,wrap(async(req,res)=>{const [rows]=await pool.execute('SELECT * FROM products ORDER BY id DESC');res.json({products:rows});}));
const productFields = body=>{
 const {name,description='',category='General',image_url='',price,stock}=body;
 const p=Number(price),s=Number(stock);
 if(typeof name!=='string'||!name.trim()||name.length>150||typeof description!=='string'||description.length>3000||typeof category!=='string'||category.length>80||typeof image_url!=='string'||image_url.length>2000||!Number.isFinite(p)||p<0||p>10000000||!Number.isSafeInteger(s)||s<0||s>1000000) return null;
 return [name.trim(),description,category,image_url,p,s];
};
app.post('/api/admin/products',auth,admin,wrap(async(req,res)=>{
 const values=productFields(req.body);if(!values)return fail(res,400,'Invalid product information');
 const [result]=await pool.execute('INSERT INTO products(name,description,category,image_url,price,stock) VALUES(?,?,?,?,?,?)',values);const [[product]]=await pool.execute('SELECT * FROM products WHERE id=?',[result.insertId]);res.status(201).json({product});
}));
app.put('/api/admin/products/:id',auth,admin,wrap(async(req,res)=>{
 const id=asId(req.params.id),values=productFields(req.body);if(!id||!values)return fail(res,400,'Invalid product information');
 const [result]=await pool.execute('UPDATE products SET name=?,description=?,category=?,image_url=?,price=?,stock=? WHERE id=?',[...values,id]);if(!result.affectedRows)return fail(res,404,'Product not found');const [[product]]=await pool.execute('SELECT * FROM products WHERE id=?',[id]);res.json({product});
}));
app.delete('/api/admin/products/:id',auth,admin,wrap(async(req,res)=>{
 const id=asId(req.params.id);if(!id)return fail(res,400,'Invalid ID');
 const [result]=await pool.execute('UPDATE products SET is_active=FALSE WHERE id=?',[id]);if(!result.affectedRows)return fail(res,404,'Product not found');res.json({ok:true});
}));
app.post('/api/orders',auth,wrap(async(req,res)=>{
 const {items,shipping_name,shipping_address}=req.body;
 if(!Array.isArray(items)||items.length<1||items.length>30||typeof shipping_name!=='string'||!shipping_name.trim()||shipping_name.length>120||typeof shipping_address!=='string'||shipping_address.trim().length<8||shipping_address.length>1000)return fail(res,400,'Provide valid cart and delivery details');
 const quantities=new Map();
 for(const item of items){const id=asId(item.product_id),qty=Number(item.quantity);if(!id||!Number.isSafeInteger(qty)||qty<1||qty>20)return fail(res,400,'Invalid cart quantities');quantities.set(id,(quantities.get(id)||0)+qty);}
 const client=await pool.getConnection();
 try{
  await client.beginTransaction();
  const selected=[];let total=0;
  for(const [id,qty] of [...quantities].sort((a,b)=>a[0]-b[0])){
   const [rows]=await client.execute('SELECT id,name,price,stock FROM products WHERE id=? AND is_active=TRUE FOR UPDATE',[id]);
   if(!rows.length||rows[0].stock<qty){await client.rollback();return fail(res,409,'A product is unavailable or has insufficient stock. Refresh your cart');}
   const item=rows[0];total+=Math.round(Number(item.price)*100)*qty;selected.push({...item,qty});
  }
  const [orderResult]=await client.execute('INSERT INTO orders(user_id,total,shipping_name,shipping_address) VALUES(?,?,?,?)',[req.user.id,(total/100).toFixed(2),shipping_name.trim(),shipping_address.trim()]); const [[order]]=await client.execute('SELECT id,total,status FROM orders WHERE id=?',[orderResult.insertId]);
  for(const p of selected){await client.execute('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price) VALUES(?,?,?,?,?)',[order.id,p.id,p.name,p.qty,p.price]);await client.execute('UPDATE products SET stock=stock-? WHERE id=?',[p.qty,p.id]);}
  await client.commit();res.status(201).json({order});
 }catch(err){await client.rollback();throw err;}finally{client.release();}
}));
app.get('/api/orders',auth,wrap(async(req,res)=>{
 const [rows]=await pool.execute('SELECT id,total,status,shipping_name,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100',[req.user.id]);res.json({orders:rows});
}));
app.get('/api/admin/orders',auth,admin,wrap(async(req,res)=>{
 const [rows]=await pool.execute('SELECT o.id,o.total,o.status,o.shipping_name,o.shipping_address,o.created_at,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 100');res.json({orders:rows});
}));
app.use((err,req,res,next)=>{console.error(err);fail(res,500,'Something went wrong on the server');});
const port=Number(process.env.PORT)||4000;
app.listen(port,()=>console.log(`Backend API running at http://localhost:${port}`));
