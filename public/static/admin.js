(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const secLabel = s => ({Caballero:"Hombre", Dama:"Mujer"})[s] || s;
  const money = n => "$" + Number(n).toLocaleString("es-CO");
  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); };

  // ---------- navegación lateral ----------
  const show = view => {
    $$(".side-nav [data-view]").forEach(b => b.dataset.view === view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $$(".view").forEach(v => v.hidden = v.id !== "view-" + view);
    history.replaceState(null, "", "#" + view);
  };
  $$(".side-nav [data-view]").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
  if (/^#(catalogo|nuevos|tienda)$/.test(location.hash)) show(location.hash.slice(1));

  // confirmación antes de eliminar productos nuevos
  $$("form[data-confirm]").forEach(f => f.addEventListener("submit", e => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));

  // ---------- productos nuevos (formulario con fotos) ----------
  $$(".edit-product").forEach(btn => btn.addEventListener("click", () => {
    const p = JSON.parse(btn.dataset.product);
    const form = $("#productForm"); form.reset();
    $("#existingImages").replaceChildren();
    (p.additional_images || []).forEach(key => {
      const label = document.createElement("label");
      const img = document.createElement("img"); img.src = "/media/" + encodeURIComponent(key); img.alt = "Foto adicional";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.name = "remove_images"; cb.value = key;
      label.append(img, cb, document.createTextNode(" Quitar"));
      $("#existingImages").append(label);
    });
    $("#productId").value = p.id;
    Object.keys(p).forEach(k => { const el = document.getElementById(k); if (!el || el.type === "file") return; if (el.type === "checkbox") el.checked = !!p[k]; else el.value = p[k] ?? ""; });
    $("#saveButton").textContent = "Actualizar producto"; $("#formTitle").textContent = "Editar producto";
    form.scrollIntoView({behavior:"smooth", block:"start"});
  }));
  $("#resetForm")?.addEventListener("click", () => {
    $("#productForm").reset(); $("#productId").value = ""; $("#existingImages").replaceChildren();
    $("#saveButton").textContent = "Guardar producto"; $("#formTitle").textContent = "Añadir producto";
  });

  // ---------- catálogo ----------
  let BASE = [];          // catálogo original (catalogo.json)
  let saved = {};         // cambios guardados en el servidor
  let draft = {};         // cambios en edición
  let shown = 40;
  const FIELDS = ["name","brand","price","size","section","gender","family","tagline","desc","notes","accords","time","longevity","sillage","seasons","featured","soldout","hidden"];
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const merged = p => ({...p, ...(draft[p.id] || {})});
  const changedIds = () => Object.keys(draft).filter(id => !same(draft[id], saved[id] || {}));
  const dirty = () => JSON.stringify(clean(draft)) !== JSON.stringify(clean(saved));
  function clean(obj) { const out = {}; Object.keys(obj).sort((a, b) => a - b).forEach(id => { if (obj[id] && Object.keys(obj[id]).length) out[id] = obj[id]; }); return out; }

  // guarda en draft solo lo que difiere del original
  function setField(id, field, value) {
    const base = BASE.find(p => String(p.id) === String(id));
    const o = {...(draft[id] || {})};
    const orig = base[field] ?? (["featured","soldout","hidden"].includes(field) ? false : null);
    if (same(value, orig)) delete o[field]; else o[field] = value;
    if (Object.keys(o).length) draft[id] = o; else delete draft[id];
  }

  function stats() {
    const all = BASE.map(merged);
    const n = (f) => all.filter(f).length;
    $("#stats").innerHTML = [
      ["Perfumes", all.length], ["Con precio", n(p => p.price)], ["Sin precio", n(p => !p.price)],
      ["Agotados", n(p => p.soldout)], ["Ocultos", n(p => p.hidden)], ["Destacados", n(p => p.featured)]
    ].map(([l, v]) => `<div><span>${l}</span><strong>${v}</strong></div>`).join("");
    $("#navCount").textContent = all.length;
  }
  function list() {
    const q = norm($("#aq").value).trim(), sec = $("#aSection").value, f = $("#aFilter").value;
    const ch = new Set(changedIds());
    return BASE.map(merged).filter(p =>
      (!sec || p.section === sec) && (!q || norm(p.name + " " + p.family + " " + (p.brand || "")).includes(q)) &&
      (!f || (f === "noprice" && !p.price) || (f === "soldout" && p.soldout) || (f === "hidden" && p.hidden) || (f === "featured" && p.featured) || (f === "changed" && (ch.has(String(p.id)) || saved[p.id]))));
  }
  function render() {
    const items = list(), ch = new Set(changedIds());
    $("#rows").innerHTML = items.slice(0, shown).map(p => `
      <div class="tr ${p.hidden ? "is-hidden" : ""} ${ch.has(String(p.id)) ? "is-dirty" : ""}" role="row" data-id="${p.id}">
        <span class="cell-name" role="cell"><img src="${esc(p.img)}" alt="" loading="lazy"><span><b>${esc(p.name)}</b><small>${p.brand ? esc(p.brand) + " · " : ""}${esc(secLabel(p.section))} · ${esc(p.family)}${p.gender === "Unisex" ? " · Unisex" : ""}</small></span></span>
        <span role="cell"><input class="price" type="number" min="0" step="1000" value="${p.price ?? ""}" placeholder="Consultar" aria-label="Precio de ${esc(p.name)}"></span>
        <span role="cell"><label class="sw"><input type="checkbox" data-f="featured" ${p.featured ? "checked" : ""} aria-label="Destacado"><i></i></label><small class="m-l">Destacado</small></span>
        <span role="cell"><label class="sw"><input type="checkbox" data-f="soldout" ${p.soldout ? "checked" : ""} aria-label="Agotado"><i></i></label><small class="m-l">Agotado</small></span>
        <span role="cell"><label class="sw"><input type="checkbox" data-f="hidden" ${p.hidden ? "checked" : ""} aria-label="Oculto"><i></i></label><small class="m-l">Oculto</small></span>
        <span role="cell"><button type="button" class="btn ghost sm" data-edit>Editar</button></span>
      </div>`).join("") || `<p class="empty">No hay perfumes con esos filtros.</p>`;
    $("#aMore").parentElement.hidden = shown >= items.length;
    stats(); bar();
  }
  function bar() {
    const n = changedIds().length + Object.keys(saved).filter(id => !draft[id]).length;
    const d = dirty();
    $("#savebar").hidden = !d;
    $("#saveMsg").textContent = d ? `Tienes cambios sin guardar${n ? ` en ${n} ${n === 1 ? "perfume" : "perfumes"}` : ""}` : "";
  }

  $("#rows").addEventListener("change", e => {
    const row = e.target.closest(".tr"); if (!row) return;
    const id = row.dataset.id;
    if (e.target.classList.contains("price")) { const v = e.target.value.trim(); const n = Math.round(Number(v)); setField(id, "price", v === "" || !Number.isFinite(n) || n < 0 ? null : n); }
    if (e.target.dataset.f) setField(id, e.target.dataset.f, e.target.checked);
    row.classList.toggle("is-dirty", changedIds().includes(id));
    if (e.target.dataset.f === "hidden") row.classList.toggle("is-hidden", e.target.checked);
    stats(); bar();
  });
  $("#rows").addEventListener("click", e => { const row = e.target.closest(".tr"); if (row && e.target.closest("[data-edit]")) openEditor(row.dataset.id); });
  let t; $("#aq").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { shown = 40; render(); }, 150); });
  $("#aSection").addEventListener("change", () => { shown = 40; render(); });
  $("#aFilter").addEventListener("change", () => { shown = 40; render(); });
  $("#aMore").addEventListener("click", () => { shown += 40; render(); });

  // precio por lote
  $("#bulkToggle").addEventListener("click", () => { const b = $("#bulk"); b.hidden = !b.hidden; $("#bulkToggle").setAttribute("aria-expanded", !b.hidden); });
  $("#bulkApply").addEventListener("click", () => {
    const v = Math.round(Number($("#bulkPrice").value));
    if (!$("#bulkPrice").value || !Number.isFinite(v) || v < 0) { toast("Escribe un precio válido"); return; }
    const only = $("#bulkOnlyEmpty").checked;
    const targets = list().filter(p => !only || !p.price);
    if (!targets.length) { toast("No hay perfumes para actualizar con esos filtros"); return; }
    if (!confirm(`¿Poner ${money(v)} a ${targets.length} perfumes? Podrás revisarlo antes de guardar.`)) return;
    targets.forEach(p => setField(p.id, "price", v));
    render(); toast(`Precio aplicado a ${targets.length} perfumes. Recuerda guardar.`);
  });

  // ---------- editor completo ----------
  let editing = null;
  const csv = a => (a || []).join(", ");
  const fromCsv = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
  function openEditor(id) {
    const p = merged(BASE.find(x => String(x.id) === String(id)));
    editing = String(id);
    const f = $("#edForm");
    $("#edImg").src = p.img; $("#edTitle").textContent = p.name; $("#edSection").textContent = secLabel(p.section);
    f.name.value = p.name || ""; f.brand.value = p.brand || ""; f.price.value = p.price ?? ""; f.size.value = p.size || "";
    f.section.value = p.section; f.gender.value = p.gender; f.family.value = p.family;
    f.featured.checked = !!p.featured; f.soldout.checked = !!p.soldout; f.hidden.checked = !!p.hidden;
    f.tagline.value = p.tagline || ""; f.desc.value = p.desc || "";
    f.top.value = csv(p.notes?.top); f.heart.value = csv(p.notes?.heart); f.base.value = csv(p.notes?.base); f.accords.value = csv(p.accords);
    f.time.value = p.time || "DN"; f.longevity.value = p.longevity ?? 3; f.sillage.value = p.sillage ?? 3;
    (p.seasons || [3,3,3,3]).forEach((v, i) => f["s" + i].value = v);
    document.body.classList.add("ed-open"); $("#editor").setAttribute("aria-hidden", "false"); f.name.focus();
  }
  function closeEditor() { document.body.classList.remove("ed-open"); $("#editor").setAttribute("aria-hidden", "true"); editing = null; }
  const clamp = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  $("#edApply").addEventListener("click", () => {
    if (!editing) return;
    const f = $("#edForm");
    if (!f.name.value.trim()) { toast("El nombre no puede quedar vacío"); f.name.focus(); return; }
    const price = f.price.value.trim() === "" ? null : clamp(f.price.value, 0, 100000000, null);
    const vals = {
      name: f.name.value.trim(), brand: f.brand.value.trim(), price, size: f.size.value.trim(), section: f.section.value, gender: f.gender.value, family: f.family.value,
      tagline: f.tagline.value.trim(), desc: f.desc.value.trim() || null,
      notes: {top: fromCsv(f.top.value), heart: fromCsv(f.heart.value), base: fromCsv(f.base.value)},
      accords: fromCsv(f.accords.value).slice(0, 5), time: f.time.value,
      longevity: clamp(f.longevity.value, 1, 5, 3), sillage: clamp(f.sillage.value, 1, 5, 3),
      seasons: [0,1,2,3].map(i => clamp(f["s" + i].value, 0, 5, 3)),
      featured: f.featured.checked, soldout: f.soldout.checked, hidden: f.hidden.checked
    };
    FIELDS.forEach(k => setField(editing, k, vals[k]));
    closeEditor(); render(); toast("Cambios aplicados. Recuerda guardar.");
  });
  $("#edReset").addEventListener("click", () => {
    if (!editing || !confirm("¿Volver este perfume a sus datos originales?")) return;
    delete draft[editing]; closeEditor(); render(); toast("Perfume restaurado. Recuerda guardar.");
  });
  $("#edClose").addEventListener("click", closeEditor);
  $("#edBg").addEventListener("click", closeEditor);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && editing) closeEditor(); });

  // ---------- guardar ----------
  $("#discard").addEventListener("click", () => { if (!confirm("¿Descartar los cambios sin guardar?")) return; draft = structuredClone(saved); render(); });
  $("#saveAll").addEventListener("click", async () => {
    const btn = $("#saveAll"); btn.disabled = true; btn.textContent = "Guardando…";
    try {
      const r = await fetch("/admin/catalog", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({overrides: clean(draft)}), credentials:"same-origin"});
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "No se pudo guardar.");
      saved = structuredClone(clean(draft)); render(); toast("Catálogo guardado. Ya se ve en la tienda.");
    } catch (err) { toast(err.message || "No se pudo guardar. Revisa tu conexión."); }
    finally { btn.disabled = false; btn.textContent = "Guardar cambios"; }
  });
  window.addEventListener("beforeunload", e => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- carga ----------
  (async () => {
    try {
      BASE = (await (await fetch("/static/catalogo.json", {cache:"no-cache"})).json()).products;
      try {
        const r = await fetch("/api/store", {cache:"no-store"});
        if (r.ok && (r.headers.get("content-type") || "").includes("json")) saved = (await r.json()).overrides || {};
      } catch {}
      draft = structuredClone(saved);
      render();
    } catch { $("#rows").innerHTML = `<p class="empty">No se pudo cargar el catálogo. Recarga la página.</p>`; }
  })();
})();
