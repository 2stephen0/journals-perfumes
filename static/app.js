(() => {
  const config = window.STORE_CONFIG || {products:[], name:"Journals Perfumes", waBase:""};
  const CART_KEY = "journals_cart_v1";
  // Keep the bag in session memory if browser storage is unavailable.
  const saveCart = () => { try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} };
  let cart = [];
  try { cart = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter(x => x && Number.isInteger(x.id) && Number.isInteger(x.qty) && x.qty > 0); } catch { cart = []; }
  const money = n => "$" + Number(n || 0).toLocaleString("es-CO") + " COP";
  const persist = () => { saveCart(); renderCart(); };
  let previousFocus;
  const openCart = () => { previousFocus = document.activeElement; document.body.classList.add("cart-opened"); document.getElementById("closeCart")?.focus(); };
  const closeCart = () => { document.body.classList.remove("cart-opened"); previousFocus?.focus(); };
  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("cart-opened")) return;
    if (e.key === "Escape") closeCart();
    if (e.key === "Tab") {
      const buttons = [...document.querySelectorAll("#cartPanel button:not(:disabled), #cartPanel a[href]")];
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
  document.getElementById("openCart")?.addEventListener("click", openCart);
  document.getElementById("closeCart")?.addEventListener("click", closeCart);
  document.getElementById("cartBackdrop")?.addEventListener("click", closeCart);

  function getProduct(id) { return config.products.find(p => Number(p.id) === Number(id)); }
  function add(id) {
    const p = getProduct(id);
    if (!p || p.stock <= 0) return;
    const line = cart.find(x => Number(x.id) === Number(id));
    if (line) {
      if (line.qty < p.stock) line.qty++;
      else alert("No hay más unidades disponibles de este perfume.");
    } else cart.push({id:p.id, qty:1});
    persist();
    openCart();
  }
  document.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => add(btn.dataset.add)));

  const detail = document.getElementById("perfumeDetail");
  const photoZoom = document.getElementById("perfumePhotoZoom");
  let zoomTrigger;
  photoZoom?.querySelector("button").addEventListener("click", () => photoZoom.close());
  photoZoom?.addEventListener("click", e => {
    if (e.target === photoZoom) photoZoom.close();
  });
  photoZoom?.addEventListener("close", () => zoomTrigger?.focus());
  let detailTrigger;
  function showDetail(id, trigger) {
    const template = document.getElementById(`product-detail-${id}`);
    if (!detail || !template) return;
    detailTrigger = trigger;
    document.getElementById("perfumeDetailContent").replaceChildren(template.content.cloneNode(true));
    detail.querySelectorAll('[data-gallery-photo]').forEach(button => button.addEventListener('click', () => {
      const photo = button.querySelector('img');
      const main = detail.querySelector('[data-gallery-main]');
      main.src = photo.src;
      main.alt = photo.alt;
      detail.querySelectorAll('[data-gallery-photo]').forEach(thumbnail => thumbnail.setAttribute('aria-pressed', String(thumbnail === button)));
    }));
    detail.querySelector("[data-photo-zoom]")?.addEventListener("click", e => {
      if (!photoZoom) return;
      const main = detail.querySelector("[data-gallery-main]");
      const enlarged = photoZoom.querySelector("[data-zoom-image]");
      enlarged.src = main.src;
      enlarged.alt = main.alt;
      zoomTrigger = e.currentTarget;
      photoZoom.showModal();
    });
    detail.showModal();
    document.body.classList.add("detail-opened");
    detail.querySelector(".perfume-detail-close").focus();
    detail.querySelector("[data-detail-add]")?.addEventListener("click", e => {
      const id = e.currentTarget.dataset.detailAdd;
      detail.close();
      add(id);
    });
    detail.querySelector('a[href="#contacto"]')?.addEventListener("click", () => detail.close());
  }
  document.querySelectorAll("[data-product-card]").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("[data-add], a")) return;
      const trigger = e.target.closest("[data-detail]") || card.querySelector("[data-detail]");
      showDetail(card.dataset.productCard, trigger);
    });
  });
  detail?.querySelector(".perfume-detail-close").addEventListener("click", () => detail.close());
  detail?.addEventListener("click", e => {
    const bounds = detail.getBoundingClientRect();
    if (e.target === detail && (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom)) detail.close();
  });
  detail?.addEventListener("close", () => {
    document.body.classList.remove("detail-opened");
    detailTrigger?.focus();
  });

  function renderCart() {
    cart = cart.filter(line => getProduct(line.id) && getProduct(line.id).stock > 0);
    cart.forEach(line => { line.qty = Math.min(line.qty, getProduct(line.id).stock); });
    const count = cart.reduce((sum, line) => sum + line.qty, 0);
    const countEl = document.getElementById("cartCount");
    if (countEl) countEl.textContent = count;
    const itemsEl = document.getElementById("cartItems");
    if (!itemsEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<div class="cart-empty">Tu bolsa está esperando una fragancia.<br><br>Explora el catálogo y añade tus favoritos.</div>';
    } else {
      itemsEl.innerHTML = cart.map(line => {
        const p = getProduct(line.id);
        return `<div class="cart-line">
          <div class="cart-thumb">J</div>
          <div><h4>${escapeHtml(p.name)}</h4><p>${escapeHtml(p.brand || "Journals Collection")} · ${escapeHtml(p.size || "")}</p>
            <div class="qty-control"><button data-qty="${p.id}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${line.qty}</span><button data-qty="${p.id}" data-delta="1" aria-label="Aumentar cantidad" ${line.qty >= p.stock ? "disabled" : ""}>+</button></div>
            <button class="cart-remove" data-remove="${p.id}">Eliminar</button>
          </div><div class="cart-line-price">${money(p.price * line.qty)}</div>
        </div>`;
      }).join("");
    }
    const total = cart.reduce((sum, line) => sum + (getProduct(line.id)?.price || 0) * line.qty, 0);
    const totalEl = document.getElementById("cartTotal");
    if (totalEl) totalEl.textContent = money(total);
    itemsEl.querySelectorAll("[data-qty]").forEach(btn => btn.addEventListener("click", () => {
      const id = Number(btn.dataset.qty), line = cart.find(x => Number(x.id) === id), p = getProduct(id);
      if (!line || !p) return;
      line.qty += Number(btn.dataset.delta);
      if (line.qty <= 0) cart = cart.filter(x => Number(x.id) !== id);
      if (line.qty > p.stock) line.qty = p.stock;
      persist();
    }));
    itemsEl.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => {
      cart = cart.filter(x => Number(x.id) !== Number(btn.dataset.remove)); persist();
    }));
    saveCart();
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  document.getElementById("checkout")?.addEventListener("click", () => {
    if (!cart.length) { alert("Añade al menos un perfume antes de continuar."); return; }
    if (!config.waBase) { alert("La tienda aún no ha configurado su WhatsApp. Vuelve en un momento."); return; }
    let total = 0;
    const lines = cart.map(line => {
      const p = getProduct(line.id);
      if (!p || line.qty < 1 || line.qty > p.stock) return null;
      const subtotal = p.price * line.qty; total += subtotal;
      return `• ${line.qty} x ${p.name}${p.size ? " ("+p.size+")" : ""} — ${money(p.price)} c/u = ${money(subtotal)}`;
    }).filter(Boolean);
    if (!lines.length) { alert("Revisa los productos de tu carrito."); return; }
    const message = `Hola, quiero realizar un pedido en ${config.name}:\n\n${lines.join("\n")}\n\n*Total estimado: ${money(total)}*\n\nMi nombre:\nDirección de entrega:\nMétodo de entrega:\n\nQuedo atento/a a la confirmación de disponibilidad y envío.`;
    window.open(config.waBase + (config.waBase.includes("?") ? "&" : "?") + "text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  });
  renderCart();
})();
