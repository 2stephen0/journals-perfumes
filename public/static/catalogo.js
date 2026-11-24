(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FAMILIES = {
    "Amaderada": {c:"#a8774f", d:"Maderas cálidas como cedro, sándalo y vetiver. Elegante, serena y con presencia."},
    "Oriental":  {c:"#c2405f", d:"Ámbar, resinas y especias. Intensa y seductora, ideal para la noche."},
    "Dulce":     {c:"#e08fb0", d:"Vainilla, caramelo y notas gourmand. Envolvente e irresistible."},
    "Fresca":    {c:"#5fb8cf", d:"Limpia y energizante, perfecta para el día a día y climas cálidos."},
    "Acuática":  {c:"#4a86e0", d:"Notas marinas y brisa. Frescura ligera que acompaña todo el día."},
    "Cítrica":   {c:"#e6bd45", d:"Bergamota, limón y mandarina. Luminosa, alegre y vibrante."},
    "Aromática": {c:"#7fae66", d:"Lavanda, hierbas y salvia. Un clásico con carácter."},
    "Floral":    {c:"#c785d6", d:"Rosa, jazmín y flores blancas. Femenina, radiante y romántica."},
    "Frutal":    {c:"#f08a5d", d:"Frutas jugosas y vivas. Divertida, juvenil y coqueta."},
    "Especiada": {c:"#d0773a", d:"Pimienta, canela y cardamomo. Cálida y con chispa."}
  };
  const ACC = {"Dulce":"#e08fb0","Fresco":"#7fd3e0","Floral":"#d48fe0","Amaderado":"#a8774f","Frutal":"#f08a5d","Ámbar":"#d9993a","Cítrico":"#e6cf45","Aromático":"#7fae66","Especiado":"#d0603a","Almizclado":"#c9b7c9","Vainilla":"#f2dcae","Acuático":"#4a86e0","Gourmand":"#b5794a","Verde":"#6fc06a","Cuero":"#7a4b35","Atalcado":"#e8d4e4","Oud":"#5d3a2a","Tabaco":"#9a6b3a","Lavanda":"#9c88d8","Ahumado":"#7d7d85","Rosa":"#e8657f","Aldehídico":"#e4e8f0","Salado":"#a8c4cf","Tropical":"#f2a93b","Oriental":"#c2405f"};
  const accColor = a => ACC[a] || "#9b909c";
  const famColor = f => (FAMILIES[f] || {c:"#9b909c"}).c;
  const SECTIONS = [
    {key:"Caballero", t:"Hombre", s:"Carácter, madera y frescura", tint:"radial-gradient(circle at 50% 35%,rgba(74,134,224,.32),transparent 65%),linear-gradient(180deg,#151a24,#0f0d12)"},
    {key:"Dama", t:"Mujer", s:"Flores, dulzura y elegancia", tint:"radial-gradient(circle at 50% 35%,rgba(224,143,176,.32),transparent 65%),linear-gradient(180deg,#22151c,#0f0d12)"},
    {key:"Árabes y nicho", t:"Árabes y nicho", s:"Oud, ámbar y exclusividad", tint:"radial-gradient(circle at 50% 35%,rgba(217,195,160,.32),transparent 65%),linear-gradient(180deg,#221c14,#0f0d12)"}
  ];
  const DAY = ["Fresca","Acuática","Cítrica","Aromática","Floral","Frutal"];
  const NIGHT = ["Oriental","Dulce","Amaderada","Especiada"];
  const SEASONS = [["Primavera"],["Verano"],["Otoño"],["Invierno"]];
  const LONG = ["", "Muy suave · 1–2 h", "Suave · 2–4 h", "Moderada · 4–6 h", "Duradera · 6–8 h", "Muy duradera · 8 h o más"];
  const SILL = ["", "Íntima · pegada a la piel", "Suave · a corta distancia", "Moderada · se nota al acercarse", "Notable · deja estela", "Intensa · llena el espacio"];
  const TIME = {D:"De día", N:"De noche", DN:"Día y noche"};
  const NOTE_CHIPS = ["Vainilla","Oud","Lavanda","Rosa","Café","Cuero","Coco","Bergamota","Jazmín","Canela","Pachulí","Ámbar","Menta","Tabaco","Sándalo","Caramelo","Piña","Notas marinas","Iris","Haba tonka"];

  let STORE = {name:"Journals Perfumes", tagline:"Tu historia tiene un aroma", whatsapp:"", currency:"COP"};
  let P = [];
  const PAGE = 24;
  const state = {q:"", section:"", gender:"", family:"", moment:"", season:"", sort:"cat", favs:false, shown:PAGE};

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  let favs = new Set(store.get("jp_favs", []).map(String));
  let cart = store.get("jp_cart", []).filter(l => l && l.id != null && Number.isInteger(l.qty) && l.qty > 0);
  let cmp = [];

  const money = n => "$" + Number(n).toLocaleString("es-CO") + " " + (STORE.currency || "COP");
  const priceText = p => p.price ? money(p.price) : "Precio a consultar";
  const byId = id => P.find(p => String(p.id) === String(id));
  const listText = arr => { const a = (arr || []).map(x => x.toLowerCase()); return a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a.at(-1) : (a[0] || ""); };
  const waLink = text => {
    const w = String(STORE.whatsapp || "").trim();
    if (!w) return "";
    const base = /^https?:\/\//i.test(w) ? w : "https://wa.me/" + w.replace(/\D/g, "");
    return base + (base.includes("?") ? "&" : "?") + "text=" + encodeURIComponent(text);
  };
  const occasions = p => {
    const o = p.time === "D" ? ["Oficina", "Universidad", "Planes al aire libre"] : p.time === "N" ? ["Citas", "Fiestas", "Eventos especiales"] : ["Uso diario", "Reuniones", "Cenas"];
    if ((p.longevity || 0) >= 5) o.push("Jornadas largas");
    if ((p.seasons || [])[1] >= 5) o.push("Clima cálido");
    if ((p.seasons || [])[3] >= 5) o.push("Clima frío");
    return o;
  };
  const describe = p => p.desc || (p.notes ? `Abre con ${listText(p.notes.top)}, revela un corazón de ${listText(p.notes.heart)} y deja un fondo de ${listText(p.notes.base)}. ${FAMILIES[p.family]?.d || ""}` : (FAMILIES[p.family]?.d || "Consulta con nosotros para conocer más de esta fragancia."));
  const secLabel = s => ({Caballero:"Hombre", Dama:"Mujer"})[s] || s;
  const allNotes = p => p.notes ? [...p.notes.top, ...p.notes.heart, ...p.notes.base] : [];

  function toast(msg) {
    const t = $("#toast"); const host = document.querySelector("dialog[open]") || document.body; if (t.parentElement !== host) host.append(t);
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  const meter = (v, max = 5) => `<span class="meter" role="img" aria-label="${v} de ${max}">${Array.from({length:max}, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("")}</span>`;
  const accordBar = p => `<span class="acc-bar" aria-hidden="true">${(p.accords || []).map((a, i) => `<i style="flex:${[40, 28, 19, 13][i] || 10};background:${accColor(a)}"></i>`).join("")}</span>`;

  // ---------- datos ----------
  async function load() {
    const data = await (await fetch("/static/catalogo.json", {cache:"no-cache"})).json();
    STORE = {...STORE, ...data.store};
    P = data.products;
    try {
      const r = await fetch("/api/store", {cache:"no-store"});
      if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
        const api = await r.json(), s = api.store || {};
        for (const k of ["name","tagline","phone","email","address","hours","instagram","facebook","tiktok"]) if (s[k]) STORE[k] = s[k];
        if (s.wa) STORE.whatsapp = s.wa;
        // Cambios hechos desde el panel de administración (nombre, precio, notas, oculto, agotado…).
        const ov = api.overrides && typeof api.overrides === "object" ? api.overrides : {};
        P = P.map(p => ov[p.id] ? {...p, ...ov[p.id], id: p.id, img: p.img} : p).filter(p => !p.hidden);
        const extra = (api.products || []).filter(p => p.image).map(p => ({
          id: "t" + p.id, name: p.name, section: "Novedades", gender: ["Hombre","Mujer","Unisex"].includes(p.category) ? p.category : "Unisex",
          family: FAMILIES[p.fragrance] ? p.fragrance : (p.fragrance || "Especial"), img: p.image, price: p.price || null, size: p.size || "",
          brand: p.brand || "", desc: p.description || "", tagline: p.description || ""
        }));
        if (extra.length) { P = [...extra, ...P]; SECTIONS.unshift({key:"Novedades", t:"Novedades", s:"Lo último en la tienda", tint:"radial-gradient(circle at 50% 35%,rgba(163,50,79,.4),transparent 65%),linear-gradient(180deg,#22141a,#0f0d12)"}); }
      }
    } catch { /* sin servidor: solo catálogo estático */ }
  }

  // ---------- hero ----------
  function hero() {
    const picks = [1, 99, 153, 37, 109, 165, 34, 139, 184, 82].map(byId).filter(Boolean);
    const box = $("#heroBottles");
    box.innerHTML = picks.map((p, i) => `<img src="${esc(p.img)}" alt="" ${i ? 'loading="lazy"' : ""}>`).join("");
    const imgs = $$("img", box); let i = 0;
    const show = () => { imgs.forEach((im, k) => im.classList.toggle("on", k === i)); $("#heroFam").textContent = picks[i].family; $("#heroName").textContent = picks[i].name; };
    show();
    if (!reduced()) setInterval(() => { i = (i + 1) % imgs.length; show(); }, 3200);
    $(".hero-stage").addEventListener("click", () => openDetail(picks[i].id));
    $$("[data-total]").forEach(el => el.textContent = P.length);
    const words = Object.keys(FAMILIES).concat(["Caballero","Dama","Árabes","Nicho","Oud","Ámbar","Vainilla"]);
    const row = words.map(w => `<span>${esc(w)}</span><span>·</span>`).join("");
    $("#marquee").innerHTML = row + row;
    $("#surprise").addEventListener("click", () => {
      const pool = filtered().length ? filtered() : P;
      let n = 0; const btn = $("#surprise"); btn.disabled = true;
      const spin = setInterval(() => {
        const p = pool[Math.floor(Math.random() * pool.length)];
        imgs[i].classList.remove("on"); $("#heroName").textContent = p.name; $("#heroFam").textContent = p.family;
        if (++n > 10) { clearInterval(spin); btn.disabled = false; imgs[i].classList.add("on"); openDetail(p.id); }
      }, 90);
    });
  }

  // ---------- colecciones ----------
  function collections() {
    const featured = {"Caballero":[34,1,82], "Dama":[109,99,139], "Árabes y nicho":[156,165,153]};
    $("#collectionGrid").innerHTML = SECTIONS.map(s => {
      const list = P.filter(p => p.section === s.key);
      const ids = featured[s.key] || list.slice(0, 3).map(p => p.id);
      const imgs = ids.map(byId).filter(Boolean).map(p => `<img src="${esc(p.img)}" alt="" loading="lazy">`).join("");
      return `<button type="button" class="collection spot reveal" style="--tint:${s.tint}" data-section="${esc(s.key)}">
        <span class="count">${list.length} fragancias</span><div class="bottles">${imgs}</div><h3>${esc(s.t)}</h3><p>${esc(s.s)} →</p></button>`;
    }).join("");
    $$("#collectionGrid .collection").forEach(b => b.addEventListener("click", () => { setFilter({section:b.dataset.section, family:""}); goCatalog(); }));
    $("#sectionTabs").innerHTML = [{key:"", t:"Todos"}, ...SECTIONS].map(s => `<button type="button" data-sec="${esc(s.key)}" aria-pressed="${s.key === state.section}">${esc(s.t)}</button>`).join("");
    $$("#sectionTabs button").forEach(b => b.addEventListener("click", () => setFilter({section:b.dataset.sec})));
  }

  // ---------- rueda olfativa en caja ----------
  function scentBox() {
    const counts = {}; P.forEach(p => counts[p.family] = (counts[p.family] || 0) + 1);
    const fams = Object.keys(FAMILIES).filter(f => counts[f]);
    $("#family").innerHTML = `<option value="">Todas las familias</option>` + fams.map(f => `<option>${esc(f)}</option>`).join("");
    $("#familyCloud").innerHTML = fams.map((f, i) => `<button type="button" class="ftile spot" style="--c:${famColor(f)}" data-fam="${esc(f)}" aria-pressed="${i === 0}">
      <span class="orb">${esc(f[0])}</span><span><b>${esc(f)}</b><small>${counts[f]} perfumes</small></span></button>`).join("");
    const preview = f => {
      const list = P.filter(p => p.family === f);
      const tally = {}; list.forEach(p => allNotes(p).forEach(n => tally[n] = (tally[n] || 0) + 1));
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
      const day = DAY.includes(f), picks = list.filter((_, k) => k % Math.max(1, Math.floor(list.length / 3)) === 0).slice(0, 3);
      $("#spCard").style.setProperty("--c", famColor(f));
      $("#spCard").innerHTML = `
        <div class="sp-head"><span class="orb big">${esc(f[0])}</span><div><h3>${esc(f)}</h3><span class="muted">${day ? "Ideal de día" : "Ideal de noche"} · ${list.length} perfumes</span></div></div>
        <p>${esc(FAMILIES[f].d)}</p>
        ${top.length ? `<div class="sp-notes">${top.map(n => `<span>${esc(n)}</span>`).join("")}</div>` : ""}
        <div class="sp-bottles">${picks.map(p => `<button type="button" data-pid="${esc(p.id)}" title="${esc(p.name)}" aria-label="Ver ${esc(p.name)}"><img src="${esc(p.img)}" alt="" loading="lazy"></button>`).join("")}</div>
        <button type="button" class="button button-gold" data-go="${esc(f)}">Ver los ${list.length} perfumes →</button>`;
      $$("[data-pid]", $("#spCard")).forEach(b => b.addEventListener("click", () => openDetail(b.dataset.pid)));
      $("[data-go]", $("#spCard")).addEventListener("click", () => { setFilter({family:f, q:"", section:""}); goCatalog(); });
    };
    $$("#familyCloud .ftile").forEach(b => b.addEventListener("click", () => {
      $$("#familyCloud .ftile").forEach(x => x.setAttribute("aria-pressed", x === b));
      preview(b.dataset.fam);
    }));
    preview(fams[0]);
    $("#noteChips").innerHTML = NOTE_CHIPS.filter(n => P.some(p => allNotes(p).some(x => norm(x).includes(norm(n))))).map(n => `<button type="button" class="nchip" data-note="${esc(n)}">${esc(n)}</button>`).join("");
    $$("#noteChips .nchip").forEach(b => b.addEventListener("click", () => { setFilter({q:b.dataset.note, family:"", section:""}); goCatalog(); }));
  }
  const goCatalog = () => $("#catalogo").scrollIntoView({behavior: reduced() ? "auto" : "smooth"});

  // ---------- catálogo ----------
  function filtered() {
    const q = norm(state.q).trim();
    let list = P.filter(p =>
      (!state.section || p.section === state.section) &&
      (!state.gender || p.gender === state.gender || (p.gender === "Unisex" && state.gender !== "Unisex")) &&
      (!state.family || p.family === state.family) &&
      (!state.moment || p.time === state.moment || p.time === "DN") &&
      (state.season === "" || (p.seasons || [3,3,3,3])[+state.season] >= 3) &&
      (!state.favs || favs.has(String(p.id))) &&
      (!q || norm(`${p.name} ${p.family} ${p.section} ${p.brand || ""} ${(p.accords || []).join(" ")} ${allNotes(p).join(" ")}`).includes(q)));
    const s = state.sort;
    if (s === "cat") list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    if (s === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (s === "za") list = [...list].sort((a, b) => b.name.localeCompare(a.name, "es"));
    if (s === "long") list = [...list].sort((a, b) => (b.longevity || 0) - (a.longevity || 0));
    if (s === "sill") list = [...list].sort((a, b) => (b.sillage || 0) - (a.sillage || 0));
    return list;
  }
  function setFilter(patch) {
    Object.assign(state, patch, {shown: PAGE});
    for (const k of ["q","family","moment","season","sort"]) $("#" + k).value = state[k];
    $("#onlyFavs").setAttribute("aria-pressed", state.favs);
    $$("#sectionTabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.sec === state.section));
    render();
  }
  function card(p) {
    const fav = favs.has(String(p.id));
    return `<article class="card spot" style="--c:${famColor(p.family)}" data-id="${esc(p.id)}">
      <div class="card-stage" data-open><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
        ${p.time ? `<span class="time-badge">${p.time === "D" ? "Día" : p.time === "N" ? "Noche" : "Día y noche"}</span>` : ""}
        ${p.soldout ? `<span class="flag out">Agotado</span>` : p.featured ? `<span class="flag">Destacado</span>` : ""}</div>
      <button type="button" class="fav" data-fav aria-pressed="${fav}" aria-label="${fav ? "Quitar de" : "Guardar en"} favoritos"><svg><use href="#i-heart"/></svg></button>
      <div class="card-info">
        <p class="inspired">${p.section === "Novedades" ? esc(p.brand || "Novedad") : "Inspirado en"}</p>
        <h3><button type="button" data-open>${esc(p.name)}</button></h3>
        <div class="meta"><span class="dot"></span>${esc(p.family)} · ${esc(p.gender)}</div>
        ${p.tagline ? `<p class="card-tag">${esc(p.tagline)}</p>` : ""}
        ${p.accords ? `<div class="acc-names">${p.accords.slice(0, 3).map(esc).join(" · ")}</div>` : ""}
        ${p.longevity ? `<div class="mini-stats"><span>Duración ${meter(p.longevity)}</span><span>Estela ${meter(p.sillage)}</span></div>` : ""}
        <div class="card-foot"><span class="p">${esc(p.price ? money(p.price) : "Consultar")}</span><button type="button" class="add" data-add ${p.soldout ? "disabled" : ""}>${p.soldout ? "Agotado" : '<svg><use href="#i-bag"/></svg> Añadir'}</button></div>
      </div></article>`;
  }
  function render() {
    const list = filtered();
    $("#grid").innerHTML = list.slice(0, state.shown).map(card).join("");
    $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "perfume" : "perfumes"}${state.q ? ` con “${state.q}”` : ""}`;
    $("#empty").hidden = list.length > 0;
    $("#more").parentElement.hidden = state.shown >= list.length;
    $("#clearFilters").hidden = !(state.q || state.section || state.gender || state.family || state.moment || state.season || state.favs);
  }
  function catalogEvents() {
    let t; $("#q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => setFilter({q:e.target.value}), 160); });
    for (const k of ["family","moment","season","sort"]) $("#" + k).addEventListener("change", e => setFilter({[k]: e.target.value}));
    $("#onlyFavs").addEventListener("click", () => setFilter({favs:!state.favs}));
    $("#clearFilters").addEventListener("click", () => setFilter({q:"", section:"", gender:"", family:"", moment:"", season:"", favs:false}));
    $("#more").addEventListener("click", () => { state.shown += PAGE; render(); });
    // Carga automática solo hasta 72 perfumes; luego el botón, para poder llegar a la guía y al contacto.
    new IntersectionObserver(es => { if (es[0].isIntersecting && state.shown < PAGE * 3 && !$("#more").parentElement.hidden) { state.shown += PAGE; render(); } }, {rootMargin:"300px"}).observe($(".more-wrap"));
    $("#grid").addEventListener("click", e => {
      const c = e.target.closest(".card"); if (!c) return;
      const id = c.dataset.id;
      if (e.target.closest("[data-fav]")) return toggleFav(id);
      if (e.target.closest("[data-add]")) {
        const b = e.target.closest("[data-add]"); addToCart(id, c.querySelector("img"));
        b.classList.add("done"); b.textContent = "✓ Añadido";
        setTimeout(() => { b.classList.remove("done"); b.innerHTML = '<svg><use href="#i-bag"/></svg> Añadir'; }, 1400); return;
      }
      if (e.target.closest("[data-open]")) openDetail(id);
    });
  }

  // Efecto "Spotlight" (adaptado de 21st.dev): luz que sigue al cursor y aro en el borde.
  function spotlight() {
    if (!matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    document.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      const el = e.target.closest?.(".spot"); if (!el) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--sx", e.clientX - r.left + "px");
        el.style.setProperty("--sy", e.clientY - r.top + "px");
      });
    }, {passive:true});
  }

  // ---------- favoritos ----------
  function toggleFav(id) {
    id = String(id);
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set("jp_favs", [...favs]);
    const on = favs.has(id);
    $$(`.card[data-id="${CSS.escape(id)}"] [data-fav]`).forEach(b => { b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", (on ? "Quitar de" : "Guardar en") + " favoritos"); });
    if (current && String(current.id) === id) $("#dFav").setAttribute("aria-pressed", on);
    updateBadges(); bump($("#favCount"));
    toast(on ? "Guardado en favoritos" : "Quitado de favoritos");
    if (state.favs) render();
  }

  // ---------- bolsa ----------
  function saveCart() { store.set("jp_cart", cart); renderCart(); updateBadges(); }
  function addToCart(id, imgEl) {
    const p = byId(id); if (!p) return;
    if (p.soldout) { toast("Este perfume está agotado por ahora"); return; }
    const l = cart.find(x => String(x.id) === String(id));
    l ? l.qty++ : cart.push({id: p.id, qty: 1});
    saveCart(); bump($("#cartCount")); addedPop(p);
    if (imgEl && !reduced()) {
      const a = imgEl.getBoundingClientRect(), b = $("#openCart").getBoundingClientRect();
      const f = document.createElement("img"); f.src = imgEl.src; f.className = "fly"; f.alt = "";
      f.style.left = a.left + a.width / 2 - 35 + "px"; f.style.top = a.top + a.height / 2 - 35 + "px";
      document.body.append(f);
      requestAnimationFrame(() => { f.style.transform = `translate(${b.left - a.left - a.width / 2 + 57}px,${b.top - a.top - a.height / 2 + 57}px) scale(.2)`; f.style.opacity = ".3"; });
      setTimeout(() => f.remove(), 850);
    }
  }
  // aviso de "añadido a la bolsa"
  function addedPop(p) {
    const box = $("#added");
    // Las ventanas abiertas (dialog) quedan por encima de todo: el aviso se muestra dentro de ellas.
    const host = $("dialog[open]") || document.body; if (box.parentElement !== host) host.append(box);
    $("#addedImg").src = p.img; $("#addedName").textContent = p.name;
    const n = cart.reduce((s, l) => s + (byId(l.id) ? l.qty : 0), 0);
    $("#addedCount").textContent = `Tienes ${n} ${n === 1 ? "perfume" : "perfumes"} en la bolsa`;
    box.hidden = false; box.classList.remove("show"); void box.offsetWidth; box.classList.add("show");
    clearTimeout(addedPop.t); addedPop.t = setTimeout(() => box.classList.remove("show"), 3500);
  }
  function renderCart() {
    const items = cart.map(l => ({...l, p: byId(l.id)})).filter(l => l.p);
    const n = items.reduce((s, l) => s + l.qty, 0);
    $("#cartSub").textContent = n ? `${n} ${n === 1 ? "perfume" : "perfumes"}` : "Vacía";
    $("#cartItems").innerHTML = items.length ? items.map(l => `
      <div class="line" data-id="${esc(l.p.id)}"><img src="${esc(l.p.img)}" alt="">
        <div><b>${esc(l.p.name)}</b><small>${esc(l.p.family)} · ${esc(priceText(l.p))}</small><br><button type="button" class="rm" data-rm>Quitar</button></div>
        <div class="qty"><button type="button" data-dec aria-label="Menos">−</button><span>${l.qty}</span><button type="button" data-inc aria-label="Más">+</button></div></div>`).join("")
      : `<div class="drawer-empty"><svg><use href="#i-bag"/></svg><p>Tu bolsa está vacía.<br>Añade perfumes desde el catálogo.</p></div>`;
    const priced = items.every(l => l.p.price);
    $("#cartTotal").textContent = !items.length ? "$0" : priced ? money(items.reduce((s, l) => s + l.p.price * l.qty, 0)) : "A consultar";
    $("#checkout").disabled = !items.length;
  }
  function cartEvents() {
    const open = () => { document.body.classList.add("cart-open", "locked"); $("#cart").setAttribute("aria-hidden", "false"); $("#closeCart").focus(); };
    const close = () => { document.body.classList.remove("cart-open", "locked"); $("#cart").setAttribute("aria-hidden", "true"); };
    $("#openCart").addEventListener("click", open);
    $("#addedView").addEventListener("click", () => { $("#added").classList.remove("show"); if ($("#detail").open) $("#detail").close(); if ($("#cmp").open) $("#cmp").close(); open(); });
    $("#addedClose").addEventListener("click", () => $("#added").classList.remove("show"));
    $("#closeCart").addEventListener("click", close);
    $("#backdrop").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("cart-open")) close(); });
    $("#cartItems").addEventListener("click", e => {
      const line = e.target.closest(".line"); if (!line) return;
      const l = cart.find(x => String(x.id) === line.dataset.id); if (!l) return;
      if (e.target.closest("[data-inc]")) l.qty++;
      if (e.target.closest("[data-dec]")) l.qty--;
      if (e.target.closest("[data-rm]")) l.qty = 0;
      cart = cart.filter(x => x.qty > 0); saveCart();
    });
    $("#checkout").addEventListener("click", () => {
      const items = cart.map(l => ({...l, p: byId(l.id)})).filter(l => l.p);
      if (!items.length) return;
      const lines = items.map(l => `• ${l.qty} x ${l.p.name} (${secLabel(l.p.section)})${l.p.price ? " – " + money(l.p.price) : ""}`).join("\n");
      const text = `Hola ${STORE.name}, quiero hacer este pedido:\n${lines}\n\n¿Me confirman precio total, envío y forma de pago? Gracias.`;
      const url = waLink(text);
      if (url) window.open(url, "_blank", "noopener");
      else { navigator.clipboard?.writeText(text).catch(() => {}); toast("Pedido copiado. Escríbenos por los datos de contacto."); close(); location.hash = "contacto"; }
    });
    $("#openFavs").addEventListener("click", () => {
      if (!favs.size) { toast("Aún no tienes favoritos. Toca el corazón de un perfume."); return; }
      setFilter({favs:true, q:"", section:"", gender:"", family:"", moment:"", season:""}); goCatalog();
    });
  }
  function updateBadges() {
    $("#cartCount").textContent = cart.reduce((s, l) => s + (byId(l.id) ? l.qty : 0), 0);
    $("#favCount").textContent = [...favs].filter(byId).length;
  }

  // ---------- detalle ----------
  let current = null;
  function setTab(id) {
    $$(".tabs [role=tab]").forEach(t => { const on = t.id === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; $("#" + t.getAttribute("aria-controls")).hidden = !on; });
    const t = $("#" + id), ink = $(".tab-ink");
    ink.style.width = t.offsetWidth + "px"; ink.style.transform = `translateX(${t.offsetLeft}px)`;
  }
  function openDetail(id) {
    const p = byId(id); if (!p) return;
    current = p;
    const list = filtered(); const ctx = list.some(x => x.id === p.id) ? list : P;
    const idx = ctx.findIndex(x => x.id === p.id);
    $("#dPrev").onclick = () => openDetail(ctx[(idx - 1 + ctx.length) % ctx.length].id);
    $("#dNext").onclick = () => openDetail(ctx[(idx + 1) % ctx.length].id);
    const c = famColor(p.family);
    $("#dStage").style.setProperty("--c", c);
    const img = $("#dImg"); img.src = p.img; img.alt = p.name;
    $("#dSection").textContent = secLabel(p.section);
    $(".detail-copy .inspired").textContent = p.section === "Novedades" ? (p.brand || "Novedad") : "Inspirado en";
    $("#dName").textContent = p.name;
    $("#dTagline").textContent = p.tagline || "";
    $("#dTags").innerHTML = `<span class="tag" style="--c:${c}">${esc(p.family)}</span>${p.gender === "Unisex" ? `<span class="tag">Unisex</span>` : ""}${p.time ? `<span class="tag">${TIME[p.time]}</span>` : ""}${p.size ? `<span class="tag">${esc(p.size)}</span>` : ""}`;

    $("#pane-desc").innerHTML = `<p class="d-desc">${esc(describe(p))}</p>
      <h4>Ideal para</h4><div class="occ">${occasions(p).map(o => `<span>${esc(o)}</span>`).join("")}</div>`;
    $("#pane-notes").innerHTML = p.notes ? `
      <div class="pyramid">
        ${[["Salida","top","Primeros minutos"],["Corazón","heart","Las siguientes horas"],["Fondo","base","La estela final"]].map(([t, k, s], i) => `
          <div class="tier t${i}"><div class="tier-h"><b>${t}</b><small>${s}</small></div><div class="tier-n">${p.notes[k].map(n => `<button type="button" class="nchip sm" data-note="${esc(n)}">${esc(n)}</button>`).join("")}</div></div>`).join("")}
      </div>
      <h4>Acordes principales</h4>
      <div class="accords">${p.accords.map((a, i) => `<div class="acc" style="--w:${[100, 78, 60, 45][i] || 35}%;--ac:${accColor(a)}"><span>${esc(a)}</span></div>`).join("")}</div>
      <p class="fine">Toca una nota para ver otros perfumes que la tienen.</p>` : `<p class="muted">Consulta las notas de esta fragancia por WhatsApp.</p>`;
    $$("#pane-notes [data-note]").forEach(b => b.addEventListener("click", () => { $("#detail").close(); setFilter({q:b.dataset.note, family:"", section:""}); goCatalog(); }));
    $("#pane-prof").innerHTML = p.seasons ? `
      <h4>Temporada</h4>
      <div class="seasons">${SEASONS.map(([s], i) => `<div class="season"><div class="s-bar"><i style="height:${p.seasons[i] * 20}%"></i></div><small>${s}</small></div>`).join("")}</div>
      <div class="prof-rows">
        <div><span>Momento</span><b>${TIME[p.time]}</b></div>
        <div><span>Duración</span><b>${meter(p.longevity)} ${LONG[p.longevity]}</b></div>
        <div><span>Estela</span><b>${meter(p.sillage)} ${SILL[p.sillage]}</b></div>
        <div><span>Intensidad</span><b>${p.longevity + p.sillage >= 9 ? "Alta" : p.longevity + p.sillage >= 7 ? "Media" : "Ligera"}</b></div>
      </div>
      <p class="fine">Perfil de referencia del aroma original. La duración real cambia según la piel y el clima.</p>` : `<p class="muted">Pregúntanos por WhatsApp cuándo usarlo.</p>`;
    setTab("tab-desc");

    $("#dPrice").innerHTML = p.price ? esc(money(p.price)) : `Precio a consultar<small>Te lo confirmamos por WhatsApp.</small>`;
    $("#dFav").setAttribute("aria-pressed", favs.has(String(p.id)));
    $("#dCmp").setAttribute("aria-pressed", cmp.includes(String(p.id)));
    $("#dAdd").onclick = () => addToCart(p.id, img);
    $("#dAdd").disabled = !!p.soldout; $("#dAdd").textContent = p.soldout ? "Agotado por ahora" : "Añadir a la bolsa";
    const wa = waLink(`Hola, quiero información sobre el perfume inspirado en ${p.name} (${secLabel(p.section)}).`);
    const dWa = $("#dWa"); dWa.href = wa || "#contacto"; wa ? (dWa.target = "_blank", dWa.rel = "noopener") : dWa.removeAttribute("target");
    dWa.onclick = wa ? null : () => $("#detail").close();
    const shared = x => (x.accords || []).filter(a => (p.accords || []).includes(a)).length;
    const sim = P.filter(x => x.id !== p.id).map(x => [shared(x) * 2 + (x.family === p.family ? 2 : 0) + (x.gender === p.gender || x.gender === "Unisex" ? 1 : 0) + Math.random(), x]).sort((a, b) => b[0] - a[0]).slice(0, 4).map(x => x[1]);
    $("#dSimilar").innerHTML = sim.map(s => `<button type="button" style="--c:${famColor(s.family)}" data-sim="${esc(s.id)}" title="${esc(s.name)}" aria-label="Ver ${esc(s.name)}"><img src="${esc(s.img)}" alt="" loading="lazy"><span>${esc(s.name)}</span></button>`).join("");
    $$("#dSimilar [data-sim]").forEach(b => b.addEventListener("click", () => openDetail(b.dataset.sim)));
    const d = $("#detail"); if (!d.open) d.showModal();
    requestAnimationFrame(() => setTab("tab-desc"));
    d.scrollTop = 0; $(".detail-copy").scrollTop = 0;
  }
  function detailEvents() {
    const d = $("#detail"), stage = $("#dStage"), img = $("#dImg");
    stage.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      img.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
      stage.classList.add("zoom");
    });
    stage.addEventListener("pointerleave", () => stage.classList.remove("zoom"));
    $$(".tabs [role=tab]").forEach(t => t.addEventListener("click", () => setTab(t.id)));
    $(".tabs").addEventListener("keydown", e => {
      const tabs = $$(".tabs [role=tab]"), i = tabs.indexOf(document.activeElement);
      if (i < 0 || !["ArrowLeft","ArrowRight"].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); setTab(n.id);
    });
    d.addEventListener("keydown", e => {
      if (e.target.closest(".tabs")) return;
      if (e.key === "ArrowLeft") $("#dPrev").click(); if (e.key === "ArrowRight") $("#dNext").click();
    });
    $("#dFav").addEventListener("click", () => current && toggleFav(current.id));
    $("#dCmp").addEventListener("click", () => current && toggleCmp(current.id));
    $$("dialog").forEach(dl => dl.addEventListener("click", e => { if (e.target === dl || e.target.closest("[data-close]")) dl.close(); }));
  }

  // ---------- comparador ----------
  function toggleCmp(id) {
    id = String(id);
    if (cmp.includes(id)) cmp = cmp.filter(x => x !== id);
    else { if (cmp.length >= 3) { toast("Puedes comparar hasta 3 perfumes"); return; } cmp.push(id); toast("Añadido al comparador"); }
    $("#dCmp").setAttribute("aria-pressed", current && cmp.includes(String(current.id)));
    renderTray();
  }
  function renderTray() {
    const tray = $("#cmpTray"); tray.hidden = !cmp.length;
    $("#cmpThumbs").innerHTML = cmp.map(byId).filter(Boolean).map(p => `<button type="button" data-rmc="${esc(p.id)}" title="Quitar ${esc(p.name)}" aria-label="Quitar ${esc(p.name)} del comparador"><img src="${esc(p.img)}" alt=""><i>×</i></button>`).join("") +
      Array.from({length: 3 - cmp.length}, () => `<span class="slot">+</span>`).join("");
    $("#cmpOpen").disabled = cmp.length < 2;
    $("#cmpOpen").textContent = cmp.length < 2 ? "Elige otro" : `Comparar ${cmp.length}`;
    $$("[data-rmc]").forEach(b => b.addEventListener("click", () => toggleCmp(b.dataset.rmc)));
  }
  function openCmp() {
    const ps = cmp.map(byId).filter(Boolean);
    const row = (label, fn) => `<div class="cr"><span class="cl">${label}</span>${ps.map(p => `<div>${fn(p)}</div>`).join("")}</div>`;
    $("#cmpTable").style.setProperty("--n", ps.length);
    $("#cmpTable").innerHTML =
      `<div class="cr head"><span class="cl"></span>${ps.map(p => `<div><img src="${esc(p.img)}" alt=""><b>${esc(p.name)}</b><small>${esc(secLabel(p.section))}</small></div>`).join("")}</div>` +
      row("Familia", p => `<span class="dot" style="--c:${famColor(p.family)}"></span> ${esc(p.family)}`) +
      row("Para", p => esc(p.gender)) +
      row("Acordes", p => (p.accords || []).map(a => `<span class="mini-acc" style="--ac:${accColor(a)}">${esc(a)}</span>`).join("")) +
      row("Salida", p => esc((p.notes?.top || []).join(", "))) +
      row("Corazón", p => esc((p.notes?.heart || []).join(", "))) +
      row("Fondo", p => esc((p.notes?.base || []).join(", "))) +
      row("Momento", p => p.time ? TIME[p.time] : "—") +
      row("Mejor temporada", p => p.seasons ? SEASONS.filter((_, i) => p.seasons[i] === Math.max(...p.seasons)).map(s => s[0]).join(", ") : "—") +
      row("Duración", p => p.longevity ? meter(p.longevity) : "—") +
      row("Estela", p => p.sillage ? meter(p.sillage) : "—") +
      row("Precio", p => esc(priceText(p))) +
      `<div class="cr"><span class="cl"></span>${ps.map(p => `<div><button type="button" class="add" data-cadd="${esc(p.id)}"><svg><use href="#i-bag"/></svg> Añadir</button></div>`).join("")}</div>`;
    $$("[data-cadd]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.cadd)));
    $("#cmp").showModal();
  }
  function cmpEvents() {
    $("#cmpOpen").addEventListener("click", () => { if ($("#detail").open) $("#detail").close(); openCmp(); });
    $("#cmpClear").addEventListener("click", () => { cmp = []; renderTray(); if (current) $("#dCmp").setAttribute("aria-pressed", false); });
  }

  // ---------- encuentra tu aroma ----------
  const quiz = {step:0, a:{}};
  const QUESTIONS = [
    {k:"gender", t:"¿Para quién es el perfume?", s:"Puede ser para ti o para regalar.", o:[
      {v:"Hombre", l:"Para él", d:"Caballero"}, {v:"Mujer", l:"Para ella", d:"Dama"}, {v:"", l:"Sin etiquetas", d:"Muéstrame todo"}]},
    {k:"moment", t:"¿Cuándo lo vas a usar?", s:"El momento cambia la intensidad ideal.", o:[
      {v:"D", l:"De día", d:"Oficina, universidad, diario"}, {v:"N", l:"De noche", d:"Citas, fiestas, eventos"}, {v:"", l:"Siempre", d:"Uno para todo"}]},
    {k:"family", t:"¿Qué aroma te atrae más?", s:"Elige la familia que más va contigo.", o:() => {
      const fams = quiz.a.moment === "D" ? DAY : quiz.a.moment === "N" ? NIGHT : Object.keys(FAMILIES);
      return fams.filter(f => P.some(p => p.family === f)).map(f => ({v:f, l:f, d:FAMILIES[f].d.split(".")[0], c:famColor(f)})).concat([{v:"", l:"Sorpréndeme", d:"Elige por mí"}]);
    }},
    {k:"power", t:"¿Qué tan intenso lo quieres?", s:"Piensa en cuánto quieres que se note.", o:[
      {v:"soft", l:"Discreto", d:"Suave, cerca de la piel"}, {v:"mid", l:"Equilibrado", d:"Se nota sin invadir"}, {v:"strong", l:"Que deje huella", d:"Potente y duradero"}]}
  ];
  function quizMatches() {
    const a = quiz.a;
    const okG = p => !a.gender || p.gender === a.gender || p.gender === "Unisex";
    const okT = p => !a.moment || !p.time || p.time === a.moment || p.time === "DN";
    const okF = p => !a.family || p.family === a.family;
    const pow = p => (p.longevity || 3) + (p.sillage || 3);
    const okP = p => !a.power || (a.power === "soft" ? pow(p) <= 6 : a.power === "mid" ? pow(p) >= 6 && pow(p) <= 8 : pow(p) >= 8);
    let res = P.filter(p => okG(p) && okT(p) && okF(p) && okP(p));
    if (res.length < 4) res = P.filter(p => okG(p) && okT(p) && okF(p));
    if (!res.length) res = P.filter(okG);
    return res.map(p => [Math.random() + (p.gender === a.gender ? .5 : 0), p]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
  }
  function renderQuiz() {
    const body = $("#quizBody");
    $("#quizBar").style.width = (quiz.step / QUESTIONS.length) * 100 + "%";
    if (quiz.step < QUESTIONS.length) {
      const q = QUESTIONS[quiz.step]; const opts = typeof q.o === "function" ? q.o() : q.o;
      body.innerHTML = `<p class="kicker">Paso ${quiz.step + 1} de ${QUESTIONS.length}</p><h2 id="quizTitle">${esc(q.t)}</h2><p class="sub">${esc(q.s)}</p>
        <div class="opts">${opts.map(o => `<button type="button" class="opt spot" data-v="${esc(o.v)}" ${o.c ? `style="--c:${o.c}"` : ""}>${o.c ? `<span class="opt-dot"></span>` : ""}<b>${esc(o.l)}</b><small>${esc(o.d)}</small></button>`).join("")}</div>
        ${quiz.step ? `<p style="margin-top:22px"><button type="button" class="link-btn" data-back>← Volver</button></p>` : ""}`;
      $$(".opt", body).forEach(b => b.addEventListener("click", () => { quiz.a[q.k] = b.dataset.v; quiz.step++; renderQuiz(); }));
      $("[data-back]", body)?.addEventListener("click", () => { quiz.step--; renderQuiz(); });
      $(".opt", body)?.focus();
    } else {
      const res = quizMatches(), top = res.slice(0, 8);
      body.innerHTML = `<p class="kicker">Tu resultado</p><h2 id="quizTitle">Estos aromas son para ti</h2>
        <p class="sub">Encontramos ${res.length} fragancias según tu estilo. Aquí tienes 8 sugerencias.</p>
        <div class="quiz-results">${top.map(p => `<button type="button" style="--c:${famColor(p.family)}" data-id="${esc(p.id)}"><img src="${esc(p.img)}" alt="" loading="lazy"><b>${esc(p.name)}</b><small>${esc(p.family)}</small></button>`).join("")}</div>
        <div class="quiz-foot"><button type="button" class="button button-gold" data-all>Ver más en el catálogo</button><button type="button" class="button button-ghost" data-again>Repetir</button></div>`;
      $$(".quiz-results [data-id]", body).forEach(b => b.addEventListener("click", () => { $("#quiz").close(); openDetail(b.dataset.id); }));
      $("[data-again]", body).addEventListener("click", () => { quiz.step = 0; quiz.a = {}; renderQuiz(); });
      $("[data-all]", body).addEventListener("click", () => {
        $("#quiz").close();
        setFilter({section: {Hombre:"Caballero", Mujer:"Dama"}[quiz.a.gender] || "", family: quiz.a.family || "", moment: quiz.a.moment || "", season:"", section:"", q:"", favs:false});
        goCatalog();
      });
    }
  }
  function quizEvents() {
    $$("[data-open-quiz]").forEach(b => b.addEventListener("click", () => { quiz.step = 0; quiz.a = {}; renderQuiz(); $("#quiz").showModal(); }));
  }

  // ---------- contacto ----------
  function contact() {
    $("#footTagline").textContent = STORE.tagline || "";
    const wa = waLink("Hola, quisiera más información.");
    const social = (v, base) => !v ? "" : /^https?:\/\//i.test(v) ? v : base + String(v).replace(/^@/, "");
    const tiles = [
      ["WhatsApp", STORE.whatsapp ? "Escríbenos" : "", wa],
      ["Teléfono", STORE.phone, STORE.phone ? "tel:" + String(STORE.phone).replace(/\s/g, "") : ""],
      ["Correo", STORE.email, STORE.email ? "mailto:" + STORE.email : ""],
      ["Instagram", STORE.instagram, social(STORE.instagram, "https://instagram.com/")],
      ["Facebook", STORE.facebook, social(STORE.facebook, "https://facebook.com/")],
      ["TikTok", STORE.tiktok, social(STORE.tiktok, "https://tiktok.com/@")],
      ["Ubicación", STORE.address, ""], ["Horario", STORE.hours, ""]
    ];
    $("#contactGrid").innerHTML = tiles.map(([l, v, h]) => {
      const safe = h && /^(https?:|tel:|mailto:)/i.test(h) ? h : "";
      return `<div class="tile spot ${v ? "" : "off"}"><span>${esc(l)}</span>${v ? (safe ? `<a href="${esc(safe)}" ${safe.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(v)}</a>` : `<b>${esc(v)}</b>`) : "<b>Disponible pronto</b>"}</div>`;
    }).join("");
    $$("[data-wa]").forEach(a => { const u = waLink(a.dataset.wa); if (u) { a.href = u; a.target = "_blank"; a.rel = "noopener"; } });
  }

  function reveals() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.1});
    els.forEach(e => io.observe(e));
  }

  load().then(() => {
    hero(); collections(); scentBox(); catalogEvents(); render(); cartEvents(); renderCart(); updateBadges();
    detailEvents(); cmpEvents(); renderTray(); quizEvents(); contact(); spotlight(); reveals();
  }).catch(err => {
    console.error(err);
    $("#grid").innerHTML = `<div class="empty"><h3>No pudimos cargar el catálogo</h3><p>Recarga la página en unos segundos.</p></div>`;
  });
})();
