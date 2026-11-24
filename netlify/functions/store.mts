import nunjucks from 'nunjucks';
import { resolve } from 'node:path';
import { getStore } from '@netlify/blobs';
import { getUser, login, logout, acceptInvite, requestPasswordRecovery, recoverPassword } from '@netlify/identity';
import { eq, desc } from 'drizzle-orm';
import { getDB } from '../../db/index.js';
import { products, settings } from '../../db/schema.js';
import type { Config } from '@netlify/functions';

class InputError extends Error {}
function defaults(): Record<string,string> {
  return { store_name:'Journals Perfumes',tagline:'Tu historia tiene un aroma',currency:'COP',whatsapp:'',whatsapp_link:'',phone:'',email:'',instagram:'',facebook:'',tiktok:'',address:'',hours:'' };
}
function safeLink(value: string, base = '') {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) { const u = new URL(value); return u.href; }
  if (base && /^@?[\w.\-]+$/.test(value)) return base + value.replace(/^@/,'');
  throw new InputError('Usa un enlace https:// o un nombre de usuario válido.');
}
// Cambios del panel sobre el catálogo estático (public/static/catalogo.json), guardados en Netlify Blobs.
type Override = Record<string, unknown>;
function cleanOverrides(input: unknown): Record<string, Override> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Formato no válido.');
  const out: Record<string, Override> = {};
  const text = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : undefined;
  const list = (v: unknown) => Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => x.trim().slice(0, 60)).filter(Boolean).slice(0, 12) : undefined;
  const int = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? v as number : undefined;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 2000) throw new InputError('Demasiados cambios.');
  for (const [id, raw] of entries) {
    if (!/^\d{1,4}$/.test(id) || !raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>, o: Override = {};
    for (const [k, max] of [['name',80],['brand',60],['tagline',220],['desc',1200],['size',30]] as const) { const v = text(r[k], max); if (v !== undefined) o[k] = v; }
    if (['Caballero','Dama','Árabes y nicho'].includes(String(r.section))) o.section = r.section;
    if (['Hombre','Mujer','Unisex'].includes(String(r.gender))) o.gender = r.gender;
    if (['Amaderada','Oriental','Dulce','Fresca','Acuática','Cítrica','Aromática','Floral','Frutal','Especiada'].includes(String(r.family))) o.family = r.family;
    if (['D','N','DN'].includes(String(r.time))) o.time = r.time;
    if (r.price === null) o.price = null; else { const v = int(r.price, 0, 100000000); if (v !== undefined) o.price = v; }
    for (const k of ['longevity','sillage']) { const v = int(r[k], 1, 5); if (v !== undefined) o[k] = v; }
    if (Array.isArray(r.seasons) && r.seasons.length === 4 && r.seasons.every(x => int(x, 0, 5) !== undefined)) o.seasons = r.seasons;
    const acc = list(r.accords); if (acc) o.accords = acc.slice(0, 5);
    if (r.notes && typeof r.notes === 'object') { const n = r.notes as Record<string, unknown>; const top = list(n.top), heart = list(n.heart), base = list(n.base); if (top && heart && base) o.notes = {top, heart, base}; }
    for (const k of ['featured','hidden','soldout','original']) if (typeof r[k] === 'boolean') o[k] = r[k];
    if (typeof r.img === 'string' && /^\/media\/[\w-]+\.(png|jpg|jpeg|webp|gif)$/.test(r.img)) o.img = r.img;
    if (Object.keys(o).length) out[id] = o;
  }
  return out;
}
async function readOverrides(): Promise<Record<string, Override>> {
  try { return (await getStore('catalog').get('overrides', {type:'json'})) as Record<string, Override> || {}; } catch { return {}; }
}
function redirect(path: string) { return new Response(null,{status:303,headers:{Location:path,'Cache-Control':'no-store'}}); }
function render(template: string, data: Record<string,unknown>) {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(resolve('templates')), {autoescape:true});
  env.addFilter('money', (n: number) => '$'+Number(n).toLocaleString('es-CO'));
  // JSON embedded in scripts must not be able to close a script tag.
  env.addFilter('tojson', value => new nunjucks.runtime.SafeString(JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/'/g,'\\u0027')));
  env.addGlobal('url_for', (route: string, args: Record<string,string> = {}) => {
    const routes: Record<string,string> = {index:'/',admin:'/admin',login:'/admin/login',logout:'/admin/logout',save_product:'/admin/product/save',save_settings:'/admin/settings',delete_product:`/admin/product/${args.product_id}/delete`,static:args.filename?.startsWith('uploads/')?'/media/'+args.filename.slice(8):'/static/'+args.filename};
    const query = new URLSearchParams();
    if (args.category) query.set('category', args.category);
    if (args.q) query.set('q', args.q);
    return routes[route] + (route === 'index' && query.size ? '?'+query.toString():'');
  });
  return new Response(env.render(template,data),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
export default async (req: Request) => {
  const url = new URL(req.url), path = url.pathname;
  try {
    if (path.startsWith('/media/')) {
      if (req.method !== 'GET') return new Response('Método no permitido',{status:405});
      const key = path.slice(7);
      if (!/^[\w-]+\.(png|jpg|jpeg|webp|gif)$/.test(key)) return new Response('No encontrado',{status:404});
      const result = await getStore('product-images').getWithMetadata(key,{type:'arrayBuffer'});
      if (!result) return new Response('No encontrado',{status:404});
      return new Response(result.data,{headers:{'Content-Type':String(result.metadata.contentType || 'application/octet-stream'),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
    }
    const user = path.startsWith('/admin') ? await getUser() : null;
    const isAdmin = !!user?.roles?.includes('admin');
    const db = getDB();
    const store = { ...defaults(), ...Object.fromEntries((await db.select().from(settings)).map(s => [s.key,s.value])) };
    const waBase = safeLink(store.whatsapp_link) || (store.whatsapp ? 'https://wa.me/'+store.whatsapp.replace(/\D/g,''):'');
    const catalogue = await db.select().from(products).where(eq(products.active,1)).orderBy(desc(products.featured),desc(products.id));
    const data: Record<string,unknown> = {store,admin_logged_in:isAdmin,wa_base:waBase,wa_url:(text:string) => waBase ? waBase+(waBase.includes('?')?'&':'?')+'text='+encodeURIComponent(text):'',socials:{instagram:safeLink(store.instagram,'https://instagram.com/'),facebook:safeLink(store.facebook,'https://facebook.com/'),tiktok:safeLink(store.tiktok,'https://tiktok.com/@')},messages:[],cartProducts:catalogue};
    if (req.method === 'POST') {
      if (req.headers.get('origin') !== url.origin) return new Response('Solicitud no permitida',{status:403});
      if (Number(req.headers.get('content-length') || 0) > 5*1024*1024) return new Response('La imagen supera el límite permitido',{status:413});
      if (path === '/admin/catalog/photo') {
        if (!isAdmin) return Response.json({error:'Necesitas una cuenta con el rol admin.'},{status:403});
        try {
          const file = (await req.formData()).get('photo');
          if (!(file instanceof File) || !file.size) throw new InputError('Selecciona una foto.');
          if (file.size > 4*1024*1024) throw new InputError('La foto debe pesar menos de 4 MB.');
          const ext: Record<string,string> = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
          if (!ext[file.type]) throw new InputError('Usa una foto PNG, JPG o WEBP.');
          const bytes = new Uint8Array(await file.arrayBuffer());
          const dec = (a: number, b: number) => new TextDecoder().decode(bytes.slice(a, b));
          const valid = file.type === 'image/png' ? bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71
            : file.type === 'image/jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255
            : dec(0,4) === 'RIFF' && dec(8,12) === 'WEBP';
          if (!valid) throw new InputError('El archivo no es una imagen válida.');
          const key = crypto.randomUUID() + '.' + ext[file.type];
          await getStore('product-images').set(key, bytes.buffer as ArrayBuffer, {metadata:{contentType:file.type}});
          return Response.json({img:'/media/' + key},{headers:{'Cache-Control':'no-store'}});
        } catch (error) {
          return Response.json({error: error instanceof InputError ? error.message : 'No se pudo subir la foto.'},{status:400});
        }
      }
      if (path === '/admin/catalog') {
        if (!isAdmin) return Response.json({error:'Necesitas una cuenta con el rol admin.'},{status:403});
        try {
          const body = await req.json() as {overrides?: unknown};
          const clean = cleanOverrides(body.overrides);
          await getStore('catalog').setJSON('overrides', clean);
          return Response.json({ok:true, count:Object.keys(clean).length},{headers:{'Cache-Control':'no-store'}});
        } catch (error) {
          return Response.json({error: error instanceof InputError ? error.message : 'No se pudo guardar el catálogo.'},{status:400});
        }
      }
      const form = await req.formData();
      const str = (key:string) => String(form.get(key) || '').trim();
      if (path === '/admin/login') {
        try { await login(str('email'),str('password')); return redirect('/admin'); }
        catch { return render('login.html',{...data,messages:['No pudimos iniciar sesión. Revisa tu correo y contraseña.']}); }
      }
      if (path === '/admin/accept') {
        try {
          if (str('password').length < 8) throw new InputError('Contraseña corta');
          if (str('kind') === 'invite') await acceptInvite(str('token'),str('password'));
          else { await recoverPassword(str('token'),str('password')); }
          return redirect('/admin');
        } catch { return render('login.html',{...data,messages:['No se pudo activar la cuenta. Usa un enlace vigente y una contraseña de al menos 8 caracteres.']}); }
      }
      if (path === '/admin/recover') {
        try { await requestPasswordRecovery(str('email')); } catch { /* Same message prevents account enumeration. */ }
        return render('login.html',{...data,messages:['Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.']});
      }
      if (path === '/admin/logout') { await logout(); return redirect('/'); }
      if (!isAdmin) return new Response('Necesitas una cuenta con el rol admin.',{status:403});
      try {
        if (path === '/admin/settings') {
          if (!str('store_name')) throw new InputError('El nombre de la tienda es obligatorio.');
          for (const [key,base] of [['whatsapp_link',''],['instagram','https://instagram.com/'],['facebook','https://facebook.com/'],['tiktok','https://tiktok.com/@']]) safeLink(str(key),base);
          const rows = Object.keys(defaults()).filter(k=>k!=='currency').map(key=>({key,value:key==='whatsapp'?str(key).replace(/\D/g,''):str(key)}));
          await db.transaction(async tx => { for (const row of rows) await tx.insert(settings).values(row).onConflictDoUpdate({target:settings.key,set:{value:row.value}}); });
        } else if (path === '/admin/product/save') {
          const number = (key:string) => { const n=Number(str(key)); if (!str(key) || !Number.isSafeInteger(n) || n<0 || n>2147483647) throw new InputError('Revisa los valores de precio e inventario.'); return n; };
          const id = str('id') ? number('id'):null;
          const current = id ? (await db.select().from(products).where(eq(products.id,id)))[0]:null;
          if (id && !current) throw new InputError('No se encontró el producto.');
          if (!str('name')) throw new InputError('El nombre del perfume es obligatorio.');
          if (!['Hombre','Mujer','Unisex'].includes(str('category'))) throw new InputError('Categoría no válida.');
          const values = {name:str('name'),brand:str('brand'),price:number('price'),old_price:str('old_price')?number('old_price'):null,description:str('description'),size:str('size'),category:str('category'),fragrance:str('fragrance'),stock:number('stock'),image:current?.image || '',additional_images:(current?.additional_images || []).filter(key => !form.getAll('remove_images').includes(key)),featured:form.get('featured')==='on'?1:0,active:form.get('active')==='on'?1:0};
          const primary=form.get('image');
          const extra=form.getAll('additional_images').filter((file): file is File => file instanceof File && file.size > 0);
          if (values.additional_images.length + extra.length > 8) throw new InputError('Puedes guardar hasta 8 fotos adicionales por perfume.');
          const files=[...(primary instanceof File && primary.size ? [primary] : []),...extra];
          if (files.reduce((sum,file)=>sum+file.size,0)>4*1024*1024) throw new InputError('Las fotos seleccionadas deben pesar menos de 4 MB en total.');
          const uploads: {key:string,bytes:Uint8Array,file:File}[]=[];
          for (const file of files) {
            if(file.size>4*1024*1024) throw new InputError('La imagen debe pesar menos de 4 MB.');
            const ext: Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
            if(!ext[file.type]) throw new InputError('Usa una imagen PNG, JPG, WEBP o GIF.');
            const bytes = new Uint8Array(await file.arrayBuffer());
            const valid = file.type==='image/png' ? bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 : file.type==='image/jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : file.type==='image/gif' ? new TextDecoder().decode(bytes.slice(0,6)).match(/^GIF8[79]a$/) : new TextDecoder().decode(bytes.slice(0,4))==='RIFF' && new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
            if(!valid) throw new InputError('El archivo no es una imagen válida.');
            uploads.push({key:crypto.randomUUID()+'.'+ext[file.type],bytes,file});
          }
          for (const upload of uploads) {
            await getStore('product-images').set(upload.key,upload.bytes.buffer as ArrayBuffer,{metadata:{contentType:upload.file.type}});
            if (upload.file === primary) values.image=upload.key;
            else values.additional_images.push(upload.key);
          }
          if (!values.image && values.additional_images.length) values.image=values.additional_images.shift()!;
          if(id) await db.update(products).set(values).where(eq(products.id,id)); else await db.insert(products).values(values);
        } else if (/^\/admin\/product\/\d+\/delete$/.test(path)) {
          await db.delete(products).where(eq(products.id,Number(path.split('/')[3])));
        } else return new Response('No encontrado',{status:404});
        return redirect('/admin?success=1');
      } catch (error) {
        const all=await db.select().from(products).orderBy(desc(products.id));
        return render('admin.html',{...data,products:all,publishedCount:all.filter(p=>p.active).length,stockCount:all.reduce((n,p)=>n+p.stock,0),messages:[error instanceof InputError?error.message:'No se pudo guardar. Intenta de nuevo.']});
      }
    }
    if(req.method!=='GET') return new Response('Método no permitido',{status:405});
    if(path==='/admin/login') return render('login.html',data);
    if(path==='/admin') {
      if(!user) return redirect('/admin/login');
      if(!isAdmin) return render('login.html',{...data,messages:['Tu cuenta no tiene permisos de administración. Solicita al propietario el rol admin.']});
      const all=await db.select().from(products).orderBy(desc(products.id));
      return render('admin.html',{...data,products:all,publishedCount:all.filter(p=>p.active).length,stockCount:all.reduce((n,p)=>n+p.stock,0),messages:url.searchParams.has('success')?['Cambios guardados correctamente.']:[]});
    }
    if(path==='/api/store') {
      // Datos públicos para el catálogo estático (public/index.html).
      const s = data.socials as Record<string,string>;
      return Response.json({
        store:{name:store.store_name,tagline:store.tagline,wa:waBase,phone:store.phone,email:store.email,address:store.address,hours:store.hours,instagram:s.instagram,facebook:s.facebook,tiktok:s.tiktok},
        overrides: await readOverrides(),
        products:catalogue.map(p=>({id:p.id,name:p.name,brand:p.brand,price:p.price,description:p.description,size:p.size,category:p.category,fragrance:p.fragrance,stock:p.stock,image:p.image?'/media/'+p.image:''}))
      },{headers:{'Cache-Control':'no-store'}});
    }
    if(path==='/' || path==='/api/products') {
      const all=catalogue;
      if(path==='/api/products') return Response.json(all.filter(p=>p.stock>0).map(({id,name,price,stock})=>({id,name,price,stock})),{headers:{'Cache-Control':'no-store'}});
      const category=url.searchParams.get('category') || '', q=(url.searchParams.get('q') || '').trim();
      const filtered=all.filter(p=>(!['Hombre','Mujer','Unisex'].includes(category)||p.category===category)&&(!q||[p.name,p.brand,p.fragrance].some(v=>v.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')))));
      return render('index.html',{...data,products:filtered,cartProducts:all,category,q});
    }
    return new Response('Página no encontrada',{status:404});
  } catch {
    return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Journals Perfumes</title><link rel="stylesheet" href="/static/style.css"><main class="login-wrap"><section class="login-card"><h1>Volvemos en un momento</h1><p>No pudimos cargar la tienda. Intenta de nuevo dentro de unos minutos.</p><a class="button button-gold" href="/">Volver a intentar</a></section></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
};
// '/' lo sirve ahora el catálogo estático public/index.html.
export const config: Config = {path:['/admin','/admin/*','/api/products','/api/store','/media/*']};
