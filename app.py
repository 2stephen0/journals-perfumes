from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
from pathlib import Path
import sqlite3, os, json, uuid, re
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "store.db"
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cambia-esta-clave-antes-de-publicar")
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
app.config["UPLOAD_FOLDER"] = str(UPLOAD_DIR)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                brand TEXT DEFAULT '',
                price INTEGER NOT NULL,
                old_price INTEGER,
                description TEXT DEFAULT '',
                size TEXT DEFAULT '',
                category TEXT DEFAULT 'Unisex',
                fragrance TEXT DEFAULT '',
                stock INTEGER DEFAULT 0,
                image TEXT DEFAULT '',
                featured INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        defaults = {
            "store_name": "Journals Perfumes",
            "whatsapp": "", "whatsapp_link": "",
            "currency": "COP",
            "tagline": "Tu historia tiene un aroma",
            "phone": "", "email": "", "instagram": "", "facebook": "", "tiktok": "",
            "address": "", "hours": ""
        }
        for k, v in defaults.items():
            conn.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
        conn.execute("UPDATE settings SET value='Journals Perfumes' WHERE key='store_name' AND value='ESSENCE PARFUM'")
        count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count == 0:
            demo = [
                ("Noir Intense", "Maison Élégance", 189000, 219000, "Una fragancia intensa con carácter amaderado y notas cálidas.", "100 ml", "Hombre", "Amaderada", 8, "", 1),
                ("Rose Élixir", "Journals Collection", 159000, None, "Una composición floral elegante, suave y memorable.", "80 ml", "Mujer", "Floral", 10, "", 1),
                ("Oud Signature", "Oriental Luxe", 225000, None, "Aroma profundo con acordes orientales y especiados.", "100 ml", "Unisex", "Oriental", 5, "", 1),
            ]
            conn.executemany("""
                INSERT INTO products(name,brand,price,old_price,description,size,category,fragrance,stock,image,featured)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)
            """, demo)

def settings_dict():
    with db() as conn:
        return {r["key"]: r["value"] for r in conn.execute("SELECT key,value FROM settings")}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image(file):
    if not file or not file.filename:
        return None
    if not allowed_file(file.filename):
        raise ValueError("Formato de imagen no permitido. Usa PNG, JPG, WEBP o GIF.")
    ext = file.filename.rsplit(".", 1)[1].lower()
    name = f"{uuid.uuid4().hex}.{ext}"
    file.save(UPLOAD_DIR / name)
    return name

def admin_required():
    return session.get("admin") is True

def clean_url(value, base=""):
    """Acepta enlace http(s) o @usuario. Rechaza cualquier otro esquema."""
    v = (value or "").strip()
    if not v:
        return ""
    if re.match(r"^https?://", v, re.I):
        return v
    if ":" in v or "/" in v or " " in v:
        raise ValueError(f"Enlace no válido: {v}. Usa un enlace que empiece por https:// o solo el @usuario.")
    return base + v.lstrip("@") if base else ""

def wa_base(s):
    link = s.get("whatsapp_link", "").strip()
    if link:
        return link
    num = re.sub(r"\D", "", s.get("whatsapp", ""))
    return f"https://wa.me/{num}" if num else ""

@app.context_processor
def inject_globals():
    s = settings_dict()
    base = wa_base(s)
    def wa_url(text=""):
        if not base:
            return ""
        return base + ("&" if "?" in base else "?") + "text=" + quote(text)
    socials = {
        "instagram": clean_url(s.get("instagram"), "https://instagram.com/") if s.get("instagram", "").startswith("http") or s.get("instagram") else "",
        "facebook": clean_url(s.get("facebook"), "https://facebook.com/") if s.get("facebook") else "",
        "tiktok": clean_url(s.get("tiktok"), "https://tiktok.com/@") if s.get("tiktok") else "",
    }
    return {"store": s, "admin_logged_in": admin_required(), "wa_base": base, "wa_url": wa_url, "socials": socials}

@app.route("/")
def index():
    category = request.args.get("category", "")
    search = request.args.get("q", "").strip()
    with db() as conn:
        sql = "SELECT * FROM products WHERE active=1"
        params = []
        if category in ("Hombre", "Mujer", "Unisex"):
            sql += " AND category=?"
            params.append(category)
        if search:
            sql += " AND (name LIKE ? OR brand LIKE ? OR fragrance LIKE ?)"
            params.extend([f"%{search}%"] * 3)
        sql += " ORDER BY featured DESC, id DESC"
        products = conn.execute(sql, params).fetchall()
    return render_template("index.html", products=products, category=category, q=search)

@app.route("/admin")
def admin():
    if not admin_required():
        return redirect(url_for("login"))
    with db() as conn:
        products = conn.execute("SELECT * FROM products ORDER BY id DESC").fetchall()
    return render_template("admin.html", products=products)

@app.route("/admin/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = os.environ.get("ADMIN_USER", "admin")
        password_hash = os.environ.get("ADMIN_PASSWORD_HASH")
        password = request.form.get("password", "")
        # Para uso local inicial: contraseña configurable por variable de entorno.
        # Si no se define hash, se utiliza la clave temporal indicada en README.
        if request.form.get("username", "") == username:
            if password_hash and check_password_hash(password_hash, password):
                session["admin"] = True
                return redirect(url_for("admin"))
            if not password_hash and password == os.environ.get("ADMIN_PASSWORD", "cambia123"):
                session["admin"] = True
                return redirect(url_for("admin"))
        flash("Usuario o contraseña incorrectos.")
    return render_template("login.html")

@app.route("/admin/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/admin/product/save", methods=["POST"])
def save_product():
    if not admin_required():
        return redirect(url_for("login"))
    try:
        form = request.form
        product_id = form.get("id", "").strip()
        name = form.get("name", "").strip()
        if not name:
            raise ValueError("El nombre del perfume es obligatorio.")
        price = int(form.get("price", "0"))
        stock = int(form.get("stock", "0"))
        if price < 0 or stock < 0:
            raise ValueError("El precio y el inventario no pueden ser negativos.")
        old_raw = form.get("old_price", "").strip()
        old_price = int(old_raw) if old_raw else None
        if old_price is not None and old_price < 0:
            raise ValueError("El precio anterior no puede ser negativo.")
        with db() as conn:
            current = None
            if product_id:
                current = conn.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
                if not current:
                    raise ValueError("No se encontró el producto.")
            image_name = save_image(request.files.get("image"))
            if not image_name:
                image_name = current["image"] if current else ""
            vals = (
                name, form.get("brand", "").strip(), price, old_price,
                form.get("description", "").strip(), form.get("size", "").strip(),
                form.get("category", "Unisex"), form.get("fragrance", "").strip(),
                stock, image_name, 1 if form.get("featured") == "on" else 0,
                1 if form.get("active") == "on" else 0
            )
            if product_id:
                conn.execute("""UPDATE products SET name=?,brand=?,price=?,old_price=?,description=?,size=?,
                    category=?,fragrance=?,stock=?,image=?,featured=?,active=? WHERE id=?""", vals + (product_id,))
            else:
                conn.execute("""INSERT INTO products(name,brand,price,old_price,description,size,category,fragrance,
                    stock,image,featured,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""", vals)
        flash("Producto guardado correctamente.")
    except (ValueError, sqlite3.Error) as e:
        flash(str(e))
    return redirect(url_for("admin"))

@app.route("/admin/product/<int:product_id>/delete", methods=["POST"])
def delete_product(product_id):
    if not admin_required():
        return redirect(url_for("login"))
    with db() as conn:
        conn.execute("DELETE FROM products WHERE id=?", (product_id,))
    flash("Producto eliminado.")
    return redirect(url_for("admin"))

@app.route("/admin/settings", methods=["POST"])
def save_settings():
    if not admin_required():
        return redirect(url_for("login"))
    fields = ["store_name", "tagline", "whatsapp", "whatsapp_link", "phone", "email",
              "instagram", "facebook", "tiktok", "address", "hours"]
    try:
        wl = request.form.get("whatsapp_link", "").strip()
        if wl and not re.match(r"^https?://", wl, re.I):
            raise ValueError("El enlace de WhatsApp debe empezar por https:// (por ejemplo https://wa.me/573001234567).")
        for f, b in (("whatsapp_link", ""), ("instagram", "https://instagram.com/"),
                     ("facebook", "https://facebook.com/"), ("tiktok", "https://tiktok.com/@")):
            clean_url(request.form.get(f, ""), b or "x")
    except ValueError as e:
        flash(str(e))
        return redirect(url_for("admin"))
    with db() as conn:
        for field in fields:
            value = request.form.get(field, "").strip()
            if field == "whatsapp":
                value = re.sub(r"\D", "", value)
            conn.execute("""INSERT INTO settings(key,value) VALUES(?,?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value""", (field, value))
    flash("Configuración actualizada.")
    return redirect(url_for("admin"))

@app.route("/api/products")
def api_products():
    with db() as conn:
        rows = conn.execute("SELECT id,name,price,stock FROM products WHERE active=1 AND stock>0").fetchall()
    return jsonify([dict(r) for r in rows])

init_db()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", "5000")))
