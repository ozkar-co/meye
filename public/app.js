      const $ = (id) => document.getElementById(id);
      let meta = null;
      let frontUrl = null;
      let backUrl = null;
      /** Snapshot of last saved/loaded item (or null if new). */
      let baselineItem = null;
      let creating = true;

      function label(key) {
        if (key == null || key === "") return "";
        if (meta?.labels?.[key]) return meta.labels[key];
        return String(key)
          .replace(/_/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase());
      }

      /** Fix float noise like 0.6000000000000001 */
      function cleanNum(n) {
        if (n == null || n === "") return n;
        if (typeof n === "string" && n.includes("/")) {
          return n
            .split("/")
            .map((p) => cleanNum(p))
            .join("/");
        }
        const x = Number(n);
        if (!Number.isFinite(x)) return n;
        return Math.round(x * 1e6) / 1e6;
      }

      function showError(msg) {
        const el = $("error");
        el.hidden = !msg;
        el.textContent = msg || "";
      }

      function fillSelect(el, items, labelFn = (x) => label(x), valueFn = (x) => x) {
        el.innerHTML = "";
        for (const item of items) {
          const opt = document.createElement("option");
          opt.value = valueFn(item);
          opt.textContent = labelFn(item);
          el.appendChild(opt);
        }
      }

      function setSelectValue(el, value) {
        if (value == null || value === "") return;
        const v = String(cleanNum(value));
        if (![...el.options].some((o) => o.value === v)) {
          const opt = document.createElement("option");
          opt.value = v;
          opt.textContent = label(v) || v;
          el.appendChild(opt);
        }
        el.value = v;
      }

      function setupCombo(comboId, inputId, hiddenId, listId, getOptions) {
        const combo = $(comboId);
        const input = $(inputId);
        const hidden = $(hiddenId);
        const list = $(listId);
        let active = -1;

        function render(filter = "") {
          const q = filter.trim().toLowerCase();
          const opts = getOptions().filter((o) => {
            const hay = `${o.value} ${o.label}`.toLowerCase();
            return !q || hay.includes(q);
          });
          list.innerHTML = opts
            .slice(0, 80)
            .map((o, i) => {
              const thumb = o.thumb
                ? `<img class="origin-thumb" src="${escapeAttr(o.thumb)}" alt="" />`
                : o.missingThumb
                ? `<div class="origin-missing"></div>`
                : "";
              return `<li data-value="${escapeAttr(o.value)}" data-i="${i}">${thumb}<span>${escapeHtml(
                o.label
              )}${
                o.hint
                  ? `<div class="muted">${escapeHtml(o.hint)}</div>`
                  : ""
              }</span></li>`;
            })
            .join("");
          active = -1;
        }

        function pick(value, display) {
          hidden.value = value;
          input.value = display;
          combo.classList.remove("open");
        }

        input.addEventListener("focus", () => {
          render(input.value);
          combo.classList.add("open");
        });
        input.addEventListener("input", () => {
          hidden.value = "";
          render(input.value);
          combo.classList.add("open");
        });
        list.addEventListener("mousedown", (e) => {
          const li = e.target.closest("li");
          if (!li) return;
          e.preventDefault();
          const value = li.dataset.value;
          const opt = getOptions().find((o) => o.value === value);
          pick(value, opt ? opt.label : value);
        });
        input.addEventListener("blur", () => {
          setTimeout(() => combo.classList.remove("open"), 120);
        });
        input.addEventListener("keydown", (e) => {
          const items = [...list.querySelectorAll("li")];
          if (e.key === "ArrowDown") {
            e.preventDefault();
            active = Math.min(active + 1, items.length - 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            active = Math.max(active - 1, 0);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0 && items[active]) items[active].dispatchEvent(new Event("mousedown"));
            return;
          } else if (e.key === "Escape") {
            combo.classList.remove("open");
            return;
          } else return;
          items.forEach((li, i) => li.classList.toggle("active", i === active));
        });

        return {
          set(value, display) {
            pick(value || "", display || "");
          },
          clear() {
            pick("", "");
          },
        };
      }

      let materialCombo, originCombo, extraMatCombo;

      function refreshClassDeps() {
        const c = $("class").value;
        fillSelect($("type"), meta.typesByClass[c] || []);
        fillSelect($("specialization"), [
          "none",
          ...(meta.specializationsByClass[c] || []),
        ]);
        refreshTypeDeps();
      }

      function refreshTypeDeps() {
        const c = $("class").value;
        const t = $("type").value;
        const subs = (meta.subTypesByType[c] && meta.subTypesByType[c][t]) || [];
        fillSelect($("sub_type"), ["none", ...subs]);
      }

      let viewedItem = null;
      let pendingObjectImage = null;

      function addEffectRow(title = "", description = "", flagKey = null) {
        const row = document.createElement("div");
        row.className = "effect";
        if (flagKey) row.dataset.flag = flagKey;
        row.innerHTML = `
          <div class="effect-head">
            <div>
              <label class="field-label">Título</label>
              <input type="text" class="effect-title" list="effect-titles" />
            </div>
            <button type="button" class="remove">Quitar</button>
          </div>
          <label class="field-label">Descripción</label>
          <textarea class="effect-desc" placeholder="Texto del reverso"></textarea>
        `;
        row.querySelector(".effect-title").value = title;
        row.querySelector(".effect-desc").value = description;
        row.querySelector(".remove").addEventListener("click", () => {
          const flag = row.dataset.flag;
          row.remove();
          if (flag) {
            const cb = document.querySelector(`#flags input[value="${flag}"]`);
            if (cb) cb.checked = false;
          }
        });
        $("effects").appendChild(row);
        return row;
      }

      function addModRow(field = "damage", value = "") {
        const row = document.createElement("div");
        row.className = "mod-row";
        const opts = (meta.modFields || [])
          .map(
            (f) =>
              `<option value="${f}" ${f === field ? "selected" : ""}>${label(
                f
              )}</option>`
          )
          .join("");
        row.innerHTML = `
          <div>
            <label class="field-label">Campo</label>
            <select class="mod-field">${opts}</select>
          </div>
          <div>
            <label class="field-label">Valor ±</label>
            <input type="number" class="mod-value" step="any" />
          </div>
          <button type="button" class="remove">Quitar</button>
        `;
        row.querySelector(".mod-value").value = value === "" ? "" : cleanNum(value);
        row.querySelector(".remove").addEventListener("click", () => row.remove());
        $("mods").appendChild(row);
      }

      function addRestRow(attr = "F", reduction = "") {
        const row = document.createElement("div");
        row.className = "rest-row";
        const opts = (meta.restrictionAttrs || [])
          .map(
            (a) =>
              `<option value="${a}" ${a === attr ? "selected" : ""}>${a} — ${label(
                a
              )}</option>`
          )
          .join("");
        row.innerHTML = `
          <div>
            <label class="field-label">Atributo</label>
            <select class="rest-attr">${opts}</select>
          </div>
          <div>
            <label class="field-label">Reducción</label>
            <input type="number" class="rest-val" step="1" />
          </div>
          <button type="button" class="remove">Quitar</button>
        `;
        row.querySelector(".rest-val").value =
          reduction === "" ? "" : cleanNum(reduction);
        row.querySelector(".remove").addEventListener("click", () => row.remove());
        $("restrictions").appendChild(row);
      }

      function collectEffects() {
        return [...$("effects").querySelectorAll(".effect")]
          .map((row) => ({
            title: row.querySelector(".effect-title").value.trim(),
            description: row.querySelector(".effect-desc").value.trim(),
          }))
          .filter((e) => e.title && e.description);
      }

      function collectModifications() {
        const mods = {};
        for (const row of $("mods").querySelectorAll(".mod-row")) {
          const field = row.querySelector(".mod-field").value;
          const raw = row.querySelector(".mod-value").value;
          if (raw === "" || raw == null) continue;
          mods[field] = cleanNum(Number(raw));
        }
        const restrictions = [...$("restrictions").querySelectorAll(".rest-row")]
          .map((row) => ({
            restriction: row.querySelector(".rest-attr").value,
            reduction: cleanNum(Number(row.querySelector(".rest-val").value)),
          }))
          .filter((r) => Number.isFinite(r.reduction));
        if (restrictions.length) mods.restrictions = restrictions;
        const raw = $("mod_price_raw").value;
        const craft = $("mod_price_craft").value;
        const fee = $("mod_price_fee").value;
        if (raw || craft || fee) {
          mods.price = {
            raw: raw ? cleanNum(Number(raw)) : 0,
            crafting: craft ? cleanNum(Number(craft)) : 0,
            fee: fee ? cleanNum(Number(fee)) : 0,
          };
        }
        return Object.keys(mods).length ? mods : undefined;
      }

      function buildBody() {
        const origin = $("origin").value;
        const sub_type = $("sub_type").value;
        const specialization = $("specialization").value;
        const flags = [...document.querySelectorAll("#flags input:checked")].map(
          (i) => i.value
        );
        const extraMat = $("extra_material").value;
        const extraTh = $("extra_thickness").value;
        const useExtra =
          origin ||
          (sub_type && sub_type !== "none") ||
          (specialization && specialization !== "none") ||
          flags.length ||
          extraMat;

        const name = $("name").value.trim();
        if (!$("material").value) throw new Error("Selecciona un material de la lista");

        const body = {
          name: name || undefined,
          class: $("class").value,
          type: $("type").value,
          material: $("material").value,
          dimension: cleanNum(Number($("dimension").value)),
          thickness: cleanNum(Number($("thickness").value)),
          quality: cleanNum(Number($("quality").value)),
          effects: collectEffects(),
          modifications: collectModifications(),
          persist: Boolean(name),
        };
        if (useExtra) {
          body.extra = {
            origin: origin || "desconocido",
            sub_type: sub_type || "none",
            specialization: specialization || "none",
            flags,
          };
          if (extraMat) {
            body.extra.material = extraMat;
            body.extra.thickness = cleanNum(Number(extraTh || 0));
          }
        }
        return body;
      }

      function clearEffectsMods() {
        $("effects").innerHTML = "";
        $("mods").innerHTML = "";
        $("restrictions").innerHTML = "";
        $("mod_price_raw").value = "";
        $("mod_price_craft").value = "";
        $("mod_price_fee").value = "";
      }

      function fillFormFromItem(item) {
        creating = false;
        baselineItem = structuredClone(item);
        $("edit-hint").textContent = `Editando ${
          item.custom_code ? `${item.code}-${item.custom_code}` : item.code
        }`;
        $("name").value = item.name || "";
        setSelectValue($("class"), item.class);
        refreshClassDeps();
        setSelectValue($("type"), item.type);
        refreshTypeDeps();
        setSelectValue($("dimension"), item.dimension);
        setSelectValue($("thickness"), Number(item.thickness));
        setSelectValue($("quality"), cleanNum(Number(item.quality)));

        const mat = meta.materials.find((m) => m.symbol === item.material);
        materialCombo.set(
          item.material,
          mat ? `${mat.symbol} — ${mat.name}` : item.material
        );

        const ex = item.extra || {};
        if (ex.origin && ex.origin !== "desconocido") {
          originCombo.set(ex.origin, label(ex.origin));
        } else {
          originCombo.clear();
        }
        setSelectValue($("sub_type"), ex.sub_type || "none");
        setSelectValue($("specialization"), ex.specialization || "none");
        if (ex.material) {
          const em = meta.materials.find((m) => m.symbol === ex.material);
          extraMatCombo.set(
            ex.material,
            em ? `${em.symbol} — ${em.name}` : ex.material
          );
        } else {
          extraMatCombo.clear();
        }
        setSelectValue($("extra_thickness"), ex.thickness ?? "");

        document.querySelectorAll("#flags input").forEach((cb) => {
          cb.checked = Array.isArray(ex.flags) && ex.flags.includes(cb.value);
        });

        clearEffectsMods();
        const effects = item.effects || [];
        if (effects.length) effects.forEach((e) => addEffectRow(e.title, e.description));
        else addEffectRow("Historia", "");

        const mods = item.modifications || {};
        for (const [k, v] of Object.entries(mods)) {
          if (k === "restrictions" || k === "price" || k === "range") continue;
          if (typeof v === "object") continue;
          addModRow(k, v);
        }
        for (const r of mods.restrictions || []) {
          addRestRow(r.restriction, r.reduction);
        }
        if (mods.price) {
          $("mod_price_raw").value = mods.price.raw ?? "";
          $("mod_price_craft").value = mods.price.crafting ?? "";
          $("mod_price_fee").value = mods.price.fee ?? "";
        }
      }

      function resetNewForm() {
        creating = true;
        baselineItem = null;
        $("edit-hint").textContent = "Nuevo objeto";
        $("edit-form").reset();
        pendingObjectImage = null;
        if ($("object-image")) $("object-image").value = "";
        refreshClassDeps();
        $("dimension").value = "5";
        $("thickness").value = "2";
        $("quality").value = "0.7";
        materialCombo.clear();
        originCombo.clear();
        extraMatCombo.clear();
        document.querySelectorAll("#flags input").forEach((cb) => {
          cb.checked = false;
        });
        clearEffectsMods();
        addEffectRow("Historia", "");
        addEffectRow("Transfondo", "");
      }

      function cancelForm() {
        showError("");
        if (creating || !baselineItem) {
          resetNewForm();
        } else {
          fillFormFromItem(baselineItem);
        }
      }

      function cardPath(base, custom, side) {
        const enc = encodeURIComponent;
        if (custom) return `/items/${enc(base)}/${enc(custom)}/card/${side}`;
        return `/items/${enc(base)}/card/${side}`;
      }

      async function showItem(item, prefix = "") {
        const empty = $(prefix ? `${prefix}-empty` : "empty");
        const out = $(prefix ? `${prefix}-out` : "out");
        empty.hidden = true;
        out.hidden = false;
        $(prefix ? `${prefix}-title` : "title").textContent =
          item.name || label(item.type) || "Objeto";
        const id = item.custom_code
          ? `${item.code}-${item.custom_code}`
          : item.code;
        $(prefix ? `${prefix}-code-line` : "code-line").textContent = `#${id}`;

        const rangeText = Array.isArray(item.range)
          ? item.range.map((u) => cleanNum(u)).join(" / ")
          : item.range != null
          ? String(cleanNum(item.range))
          : "—";
        const price = item.price || {};
        const stats = [
          ["Daño", item.damage],
          ["Corte", item.slice],
          ["Desangre", item.bleeding],
          ["Peso", item.weight],
          ["Lance", item.throwing],
          ["Amort.", item.damping],
          ["Resist.", item.resistence],
          ["Vida", item.useful_life],
          ["Rango", rangeText],
          ["Nivel", label(item.crafting_level) || item.crafting_level],
          ["Calidad", cleanNum(item.quality)],
          ["Rareza", label(item.rarity) || item.rarity],
          ["Raw", price.raw != null ? `${cleanNum(price.raw)} R` : "—"],
          ["Taller", price.crafting != null ? `${cleanNum(price.crafting)} R` : "—"],
          ["Tasa", price.fee != null ? `${cleanNum(price.fee)} R` : "—"],
        ];
        $(prefix ? `${prefix}-stats` : "stats").innerHTML = stats
          .map(
            ([k, v]) =>
              `<div class="stat"><b>${k}</b><span>${escapeHtml(
                String(cleanNum(v) ?? "—")
              )}</span></div>`
          )
          .join("");

        $(prefix ? `${prefix}-effects-out` : "effects-out").innerHTML = (item.effects || [])
          .map(
            (e) =>
              `<li><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(
                e.description
              )}</span></li>`
          )
          .join("");

        const frontEl = $(prefix ? `${prefix}-front` : "front");
        const backEl = $(prefix ? `${prefix}-back` : "back");
        const frontPh = $(prefix ? `${prefix}-front-ph` : "front-ph");
        const backPh = $(prefix ? `${prefix}-back-ph` : "back-ph");
        if (frontUrl) URL.revokeObjectURL(frontUrl);
        if (backUrl) URL.revokeObjectURL(backUrl);
        frontEl.hidden = true;
        backEl.hidden = true;
        frontPh.hidden = false;
        backPh.hidden = false;
        frontPh.textContent = "generando frente…";
        backPh.textContent = "generando reverso…";

        const params = new URLSearchParams({ t: String(Date.now()) });
        if (item.name) params.set("name", item.name);
        const q = `?${params.toString()}`;
        const [frontRes, backRes] = await Promise.all([
          fetch(cardPath(item.code, item.custom_code, "front") + q),
          fetch(cardPath(item.code, item.custom_code, "back") + q),
        ]);
        if (!frontRes.ok) throw new Error("No se pudo generar el frente");
        if (!backRes.ok) throw new Error("No se pudo generar el reverso");
        frontUrl = URL.createObjectURL(await frontRes.blob());
        backUrl = URL.createObjectURL(await backRes.blob());
        frontEl.src = frontUrl;
        backEl.src = backUrl;
        frontEl.hidden = false;
        backEl.hidden = false;
        frontPh.hidden = true;
        backPh.hidden = true;
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }
      function escapeAttr(s) {
        return escapeHtml(s).replace(/"/g, "&quot;");
      }

      async function fetchItem(base, custom) {
        const url = custom
          ? `/items/${encodeURIComponent(base)}/${encodeURIComponent(custom)}`
          : `/items/${encodeURIComponent(base)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
      }

      async function openItem(base, custom, { edit = false } = {}) {
        const item = await fetchItem(base, custom);
        viewedItem = item;
        if (edit) {
          fillFormFromItem(item);
          setApp("create");
          await showItem(item);
        } else {
          setApp("view");
          await showItem(item, "view");
        }
      }

      async function refreshList() {
        const res = await fetch("/items");
        const items = await res.json();
        if (!res.ok) throw new Error(items.message || res.statusText);
        const list = $("item-list");
        if (!items.length) {
          list.innerHTML = '<li class="empty">No hay objetos guardados.</li>';
          return;
        }
        list.innerHTML = "";
        for (const it of items) {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          btn.innerHTML = `<span class="name">${escapeHtml(
            it.name
          )}</span><span class="id">${escapeHtml(it.id)}</span>`;
          btn.addEventListener("click", async () => {
            try {
              showError("");
              await openItem(it.base_code, it.custom_code || undefined);
            } catch (err) {
              showError(err.message || String(err));
            }
          });
          li.appendChild(btn);
          list.appendChild(li);
        }
      }

      $("class").addEventListener("change", refreshClassDeps);
      $("type").addEventListener("change", refreshTypeDeps);
      $("add-effect").addEventListener("click", () => addEffectRow());
      $("add-mod").addEventListener("click", () => addModRow());
      $("add-rest").addEventListener("click", () => addRestRow());
      $("cancel-btn").addEventListener("click", cancelForm);
      $("object-image").addEventListener("change", (e) => {
        pendingObjectImage = e.target.files && e.target.files[0] ? e.target.files[0] : null;
      });

      async function uploadObjectImage(item) {
        if (!pendingObjectImage) return;
        const id = item.custom_code
          ? `${item.code}/${item.custom_code}`
          : item.code;
        const fd = new FormData();
        fd.append("file", pendingObjectImage, pendingObjectImage.name);
        const res = await fetch(`/items/${id.split("/").map(encodeURIComponent).join("/")}/image`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "No se pudo subir la imagen");
        }
        pendingObjectImage = null;
        $("object-image").value = "";
      }

      $("edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        showError("");
        try {
          const body = buildBody();
          if (!body.name) {
            showError("Pon un nombre para guardar el objeto.");
            return;
          }
          if (!creating && baselineItem) {
            body.previous_id = baselineItem.custom_code
              ? `${baselineItem.code}-${baselineItem.custom_code}`
              : baselineItem.code;
          }
          const res = await fetch("/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || res.statusText);
          await uploadObjectImage(data);
          fillFormFromItem(data);
          await showItem(data);
        } catch (err) {
          showError(err.message || String(err));
        }
      });

      $("load-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        showError("");
        try {
          await openItem(
            $("base").value.trim(),
            $("custom").value.trim() || undefined
          );
        } catch (err) {
          showError(err.message || String(err));
        }
      });

      $("view-edit").addEventListener("click", async () => {
        if (!viewedItem) return;
        fillFormFromItem(viewedItem);
        setApp("create");
        await showItem(viewedItem);
      });

      $("view-delete").addEventListener("click", async () => {
        if (!viewedItem) return;
        const id = viewedItem.custom_code
          ? `${viewedItem.code}-${viewedItem.custom_code}`
          : viewedItem.code;
        if (!confirm(`¿Eliminar ${viewedItem.name || id}?`)) return;
        const path = viewedItem.custom_code
          ? `/items/${encodeURIComponent(viewedItem.code)}/${encodeURIComponent(viewedItem.custom_code)}`
          : `/items/${encodeURIComponent(viewedItem.code)}`;
        const res = await fetch(path, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError(data.message || res.statusText);
          return;
        }
        viewedItem = null;
        $("view-out").hidden = true;
        $("view-empty").hidden = false;
        await refreshList();
      });

      (async () => {
        try {
          const res = await fetch("/meta");
          meta = await res.json();
          if (!res.ok) throw new Error(meta.message || "meta failed");

          const datalist = document.createElement("datalist");
          datalist.id = "effect-titles";
          const suggest = [
            "Historia",
            "Transfondo",
            "Diseño",
            "Construcción",
            ...meta.flags.map((f) => label(f)),
          ];
          datalist.innerHTML = suggest
            .map((t) => `<option value="${escapeAttr(t)}"></option>`)
            .join("");
          document.body.appendChild(datalist);

          fillSelect($("class"), meta.classes);
          fillSelect($("var-class"), meta.classes);
          fillSelect($("mat-level"), meta.craftingLevels || []);
          fillSelect($("mat-cat"), meta.materialCategories || []);
          fillSelect($("dimension"), meta.sizes, (s) => String(cleanNum(s)));
          fillSelect($("thickness"), meta.sizes, (s) => String(cleanNum(s)));
          fillSelect(
            $("quality"),
            meta.qualities,
            (q) => String(cleanNum(q)),
            (q) => String(cleanNum(q))
          );
          fillSelect($("extra_thickness"), ["", ...meta.sizes], (s) =>
            s === "" ? "(—)" : String(cleanNum(s))
          );

          materialCombo = setupCombo(
            "material_combo",
            "material_q",
            "material",
            "material_list",
            () =>
              meta.materials.map((m) => ({
                value: m.symbol,
                label: `${m.symbol} — ${m.name}`,
                hint: m.name,
              }))
          );
          originCombo = setupCombo(
            "origin_combo",
            "origin_q",
            "origin",
            "origin_list",
            () =>
              (meta.originDetails || meta.origins.map((o) => ({ key: o, has_image: false }))).map(
                (o) => {
                  const key = o.key || o;
                  return {
                    value: key,
                    label: label(key),
                    thumb: o.has_image ? `/media/origins/${encodeURIComponent(key)}` : "",
                    missingThumb: !o.has_image,
                  };
                }
              )
          );
          extraMatCombo = setupCombo(
            "extra_material_combo",
            "extra_material_q",
            "extra_material",
            "extra_material_list",
            () =>
              meta.materials.map((m) => ({
                value: m.symbol,
                label: `${m.symbol} — ${m.name}`,
              }))
          );

          $("flags").innerHTML = meta.flags
            .map(
              (f) =>
                `<label><input type="checkbox" value="${f}" /> <span>${label(
                  f
                )}</span></label>`
            )
            .join("");

          $("flags").addEventListener("change", (e) => {
            const cb = e.target;
            if (!(cb instanceof HTMLInputElement) || cb.type !== "checkbox") return;
            const flag = cb.value;
            if (cb.checked) {
              const exists = [...$("effects").querySelectorAll(".effect")].some(
                (row) => row.dataset.flag === flag
              );
              if (!exists) addEffectRow(label(flag), "", flag);
            } else {
              [...$("effects").querySelectorAll(`.effect[data-flag="${flag}"]`)].forEach(
                (row) => row.remove()
              );
            }
          });

          resetNewForm();
          wireCatalogUi();
        } catch (err) {
          showError("No se pudo cargar /meta: " + err.message);
        }
      })();

      async function apiJson(url, opts) {
        const res = await fetch(url, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
      }

      async function reloadMeta() {
        const res = await fetch("/meta");
        meta = await res.json();
        if (!res.ok) throw new Error(meta.message || "meta failed");
        refreshClassDeps();
      }

      async function refreshMaterialsModal() {
        const rows = await apiJson("/materials");
        $("mat-list").innerHTML = rows
          .filter((m) => !m.symbol.includes("+"))
          .map(
            (m) =>
              `<div class="catalog-row"><span><b>${escapeHtml(m.symbol)}</b> ${escapeHtml(
                m.name
              )} <span class="muted">id ${m.encoding_id}</span></span><button type="button" class="remove" data-del-mat="${escapeAttr(
                m.symbol
              )}">Quitar</button></div>`
          )
          .join("");
      }

      async function refreshOriginsModal() {
        const rows = await apiJson("/origins");
        $("origin-admin-list").innerHTML = rows
          .map((o) => {
            const img = o.has_image
              ? `<img src="/media/origins/${encodeURIComponent(o.key)}?t=${Date.now()}" alt="" />`
              : `<div class="origin-missing"></div>`;
            return `<div class="catalog-row">${img}<span><b>${escapeHtml(
              o.label
            )}</b> <span class="muted">${escapeHtml(o.key)}</span>${
              o.has_image ? "" : " · falta imagen"
            }</span><input type="file" accept="image/*" data-origin-file="${escapeAttr(
              o.key
            )}" /><button type="button" class="remove" data-del-origin="${escapeAttr(
              o.key
            )}">Quitar</button></div>`;
          })
          .join("");
      }

      function fillVariantSelects() {
        fillSelect($("var-class"), meta.classes);
        const c = $("var-class").value;
        fillSelect($("var-type"), meta.typesByClass[c] || []);
      }

      async function refreshVariantsModal() {
        const c = $("var-class").value;
        const t = $("var-type").value;
        const subs = await apiJson(
          `/sub-types?class=${encodeURIComponent(c)}&type=${encodeURIComponent(t)}`
        );
        const specs = await apiJson(`/specializations?class=${encodeURIComponent(c)}`);
        $("sub-list").innerHTML = subs
          .map(
            (s) =>
              `<div class="catalog-row"><span>${escapeHtml(s.label)} <span class="muted">${escapeHtml(
                s.key
              )} · ${s.encoding_id}</span></span><button type="button" class="remove" data-del-sub="${escapeAttr(
                `${s.class}/${s.type}/${s.key}`
              )}">Quitar</button></div>`
          )
          .join("") || '<p class="mode-hint">Ninguno</p>';
        $("spec-list").innerHTML = specs
          .map(
            (s) =>
              `<div class="catalog-row"><span>${escapeHtml(s.label)} <span class="muted">${escapeHtml(
                s.key
              )} · ${s.encoding_id}</span></span><button type="button" class="remove" data-del-spec="${escapeAttr(
                `${s.class}/${s.key}`
              )}">Quitar</button></div>`
          )
          .join("") || '<p class="mode-hint">Ninguna</p>';
      }

      function wireCatalogUi() {
        if ($("open-materials")) {
          $("open-materials").addEventListener("click", async () => {
            await refreshMaterialsModal();
            $("modal-materials").showModal();
          });
        }
        $("open-origins").addEventListener("click", async () => {
          await refreshOriginsModal();
          $("modal-origins").showModal();
        });
        $("open-variants").addEventListener("click", async () => {
          fillVariantSelects();
          await refreshVariantsModal();
          $("modal-variants").showModal();
        });

        $("mat-list").addEventListener("click", async (e) => {
          const btn = e.target.closest("[data-del-mat]");
          if (!btn) return;
          if (!confirm(`¿Eliminar material ${btn.dataset.delMat}?`)) return;
          try {
            await apiJson(`/materials/${encodeURIComponent(btn.dataset.delMat)}`, {
              method: "DELETE",
            });
            await reloadMeta();
            await refreshMaterialsModal();
          } catch (err) {
            showError(err.message);
          }
        });

        $("mat-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            await apiJson("/materials", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                symbol: $("mat-symbol").value,
                name: $("mat-name").value,
                weight: Number($("mat-weight").value),
                group: Number($("mat-group").value),
                price: Number($("mat-price").value),
                resistence: Number($("mat-res").value),
                damping: Number($("mat-damp").value),
                useful_life: Number($("mat-life").value),
                slice: Number($("mat-slice").value || 0),
                damage: Number($("mat-damage").value || 0),
                decadency: $("mat-dec").value || "-",
                level: $("mat-level").value,
                category: $("mat-cat").value,
              }),
            });
            $("mat-form").reset();
            await reloadMeta();
            await refreshMaterialsModal();
          } catch (err) {
            alert(err.message);
          }
        });

        $("origin-admin-list").addEventListener("click", async (e) => {
          const btn = e.target.closest("[data-del-origin]");
          if (!btn) return;
          if (!confirm(`¿Eliminar origen ${btn.dataset.delOrigin}?`)) return;
          try {
            await apiJson(`/origins/${encodeURIComponent(btn.dataset.delOrigin)}`, {
              method: "DELETE",
            });
            await reloadMeta();
            await refreshOriginsModal();
          } catch (err) {
            alert(err.message);
          }
        });
        $("origin-admin-list").addEventListener("change", async (e) => {
          const input = e.target.closest("[data-origin-file]");
          if (!input || !input.files[0]) return;
          const fd = new FormData();
          fd.append("file", input.files[0], input.files[0].name);
          const res = await fetch(
            `/origins/${encodeURIComponent(input.dataset.originFile)}/image`,
            { method: "POST", body: fd }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(data.message || "No se pudo subir");
            return;
          }
          await reloadMeta();
          await refreshOriginsModal();
        });

        $("origin-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            const created = await apiJson("/origins", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ label: $("origin-label").value }),
            });
            const file = $("origin-new-image").files[0];
            if (file) {
              const fd = new FormData();
              fd.append("file", file, file.name);
              const res = await fetch(
                `/origins/${encodeURIComponent(created.key)}/image`,
                { method: "POST", body: fd }
              );
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Origen creado, falló la imagen");
              }
            }
            $("origin-form").reset();
            await reloadMeta();
            await refreshOriginsModal();
          } catch (err) {
            alert(err.message);
          }
        });

        $("var-class").addEventListener("change", async () => {
          fillSelect($("var-type"), meta.typesByClass[$("var-class").value] || []);
          await refreshVariantsModal();
        });
        $("var-type").addEventListener("change", () => refreshVariantsModal());

        $("sub-list").addEventListener("click", async (e) => {
          const btn = e.target.closest("[data-del-sub]");
          if (!btn) return;
          if (!confirm("¿Eliminar subtipo?")) return;
          try {
            await apiJson(`/sub-types/${btn.dataset.delSub}`, { method: "DELETE" });
            await reloadMeta();
            await refreshVariantsModal();
          } catch (err) {
            alert(err.message);
          }
        });
        $("spec-list").addEventListener("click", async (e) => {
          const btn = e.target.closest("[data-del-spec]");
          if (!btn) return;
          if (!confirm("¿Eliminar especialización?")) return;
          try {
            await apiJson(`/specializations/${btn.dataset.delSpec}`, {
              method: "DELETE",
            });
            await reloadMeta();
            await refreshVariantsModal();
          } catch (err) {
            alert(err.message);
          }
        });
        $("sub-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            await apiJson("/sub-types", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                class: $("var-class").value,
                type: $("var-type").value,
                label: $("sub-label").value,
              }),
            });
            $("sub-label").value = "";
            await reloadMeta();
            await refreshVariantsModal();
          } catch (err) {
            alert(err.message);
          }
        });
        $("spec-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            await apiJson("/specializations", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                class: $("var-class").value,
                label: $("spec-label").value,
              }),
            });
            $("spec-label").value = "";
            await reloadMeta();
            await refreshVariantsModal();
          } catch (err) {
            alert(err.message);
          }
        });

        $("lang-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const word = $("lang-word").value.trim();
          const direction = $("lang-dir").value;
          try {
            const data = await apiJson("/languages/sujfi/translate", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ word, direction }),
            });
            $("lang-result").hidden = false;
            $("lang-result").textContent = data.result;
            const imgRes = await fetch("/languages/sujfi/image", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ word: direction === "to" ? data.result : word }),
            });
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              $("lang-img").src = URL.createObjectURL(blob);
              $("lang-img").hidden = false;
              $("lang-ph").hidden = true;
            }
          } catch (err) {
            alert(err.message);
          }
        });
      }

      const XP_STORAGE_KEY = "meye-xp-calc";

      function defaultXpState() {
        return {
          includeSupernatural: false,
          doubleType1: false,
          earned: { basic: 0, special: 0, supernatural: 0 },
          basic: {
            physical: {
              strength: 0,
              agility: 0,
              speed: 0,
              resistance: 0,
              talented: false,
            },
            mental: {
              intelligence: 0,
              wisdom: 0,
              concentration: 0,
              will: 0,
              talented: false,
            },
            coordination: {
              precision: 0,
              calculation: 0,
              range: 0,
              reflexes: 0,
              talented: false,
            },
            life: 0,
          },
          special: {
            physical: { empowerment: 0, vitalControl: 0, talented: false },
            energy: { energyHandling: 0, objectHandling: 0, talented: false },
            mental: { illusion: 0, mentalControl: 0, talented: false },
            energyTank: 0,
            energyTankTalented: false,
          },
          supernatural: { skills: [{ transformations: [0] }] },
        };
      }

      function getPath(obj, path) {
        return path.split(".").reduce((cur, key) => (cur == null ? cur : cur[key]), obj);
      }

      function setPath(obj, path, value) {
        const parts = path.split(".");
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
        cur[parts[parts.length - 1]] = value;
      }

      function fmtXp(n) {
        return Number(n || 0).toLocaleString("es");
      }

      function loadXpState() {
        try {
          const raw = localStorage.getItem(XP_STORAGE_KEY);
          if (!raw) return defaultXpState();
          const parsed = JSON.parse(raw);
          const base = defaultXpState();
          return {
            ...base,
            ...parsed,
            includeSupernatural: Boolean(parsed.includeSupernatural),
            doubleType1: Boolean(parsed.doubleType1),
            earned: { ...base.earned, ...(parsed.earned || {}) },
            basic: {
              physical: { ...base.basic.physical, ...(parsed.basic?.physical || {}) },
              mental: { ...base.basic.mental, ...(parsed.basic?.mental || {}) },
              coordination: {
                ...base.basic.coordination,
                ...(parsed.basic?.coordination || {}),
              },
              life: parsed.basic?.life ?? 0,
            },
            special: {
              physical: { ...base.special.physical, ...(parsed.special?.physical || {}) },
              energy: { ...base.special.energy, ...(parsed.special?.energy || {}) },
              mental: { ...base.special.mental, ...(parsed.special?.mental || {}) },
              energyTank: parsed.special?.energyTank ?? 0,
              energyTankTalented: Boolean(parsed.special?.energyTankTalented),
            },
            supernatural: {
              skills:
                parsed.supernatural?.skills?.length
                  ? parsed.supernatural.skills.map((s) => ({
                      transformations:
                        s.transformations?.length ? s.transformations : [0],
                    }))
                  : base.supernatural.skills,
            },
          };
        } catch {
          return defaultXpState();
        }
      }

      let xpState = loadXpState();

      function saveXpState() {
        try {
          localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(xpState));
        } catch (err) {
          console.warn("No se pudo guardar la calculadora de XP", err);
        }
      }

      let xpHydrating = false;

      function appFromHash() {
        const h = (location.hash || "").replace(/^#/, "");
        if (h === "view" || h === "xp" || h === "lang") return h;
        if (h === "info" || h.startsWith("info-")) return "info";
        return "create";
      }

      function scrollInfoAnchor() {
        const id = (location.hash || "").replace(/^#/, "");
        if (!id.startsWith("info-")) return;
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function setApp(app, opts = {}) {
        document.querySelectorAll("#app-nav button").forEach((b) => {
          b.classList.toggle("active", b.dataset.app === app);
        });
        $("app-info").hidden = app !== "info";
        $("app-create").hidden = app !== "create";
        $("app-view").hidden = app !== "view";
        $("app-xp").hidden = app !== "xp";
        $("app-lang").hidden = app !== "lang";
        const lines = {
          info: "Definiciones y fórmulas · Tierras de Meye",
          create: "Editor de objetos y cartas · Tierras de Meye",
          view: "Colección de objetos · Tierras de Meye",
          xp: "Calculadora de experiencia · Tierras de Meye",
          lang: "Lenguajes construidos · Tierras de Meye",
        };
        $("tagline").textContent = lines[app] || lines.create;
        if (!opts.keepHash) {
          const url = new URL(location.href);
          url.hash = app === "create" ? "" : app;
          history.replaceState(null, "", url.pathname + url.search + url.hash);
          if (app === "info") {
            const toc = document.querySelector(".info-toc");
            if (toc) toc.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        if (app === "view") refreshList().catch((e) => showError(e.message));
      }

      function hintText(spent, next) {
        return `gastado <b>${fmtXp(spent)}</b> · próximo <b>${fmtXp(next)}</b>`;
      }

      function renderXpSkills() {
        const root = $("xp-skills");
        root.innerHTML = "";
        xpState.supernatural.skills.forEach((skill, si) => {
          const block = document.createElement("div");
          block.className = "skill-block";
          const rows = skill.transformations
            .map(
              (value, ti) => `
            <div class="trans-row">
              <div>
                <label class="field-label">Transformación ${ti + 1}</label>
                <input type="number" min="0" step="1" value="${value}" data-skill="${si}" data-trans="${ti}" />
              </div>
              <button type="button" class="remove" data-remove-trans="${si}:${ti}" ${
                skill.transformations.length <= 1 ? "disabled" : ""
              }>Quitar</button>
            </div>`
            )
            .join("");
          block.innerHTML = `
            <div class="skill-head">
              <strong>Habilidad ${si + 1}</strong>
              <button type="button" class="remove" data-remove-skill="${si}" ${
                xpState.supernatural.skills.length <= 1 ? "disabled" : ""
              }>Quitar</button>
            </div>
            ${rows}
            <button type="button" class="add-btn" data-add-trans="${si}">+ Añadir transformación</button>
            <div class="xp-group-spent" data-xp-skill="${si}"></div>
          `;
          root.appendChild(block);
        });
        wireNumericInputs(root);
      }

      function enforceLifeCap() {
        if (!window.MeyeXp) return 0;
        const max = window.MeyeXp.maxLifeFromPhysical(xpState.basic.physical);
        const lifeInput = $("xp-life");
        if (lifeInput) lifeInput.max = String(max);
        if (xpState.basic.life > max) {
          xpState.basic.life = max;
          if (lifeInput) lifeInput.value = String(max);
        }
        const capNote = $("xp-life-cap");
        if (capNote) {
          capNote.textContent =
            max > 0
              ? `Tope ${fmtXp(max)} · doble del promedio físico`
              : "Tope 0 · sube los valores físicos para poder tener vida";
        }
        return max;
      }

      function applyXpInput(t) {
        if (!(t instanceof HTMLInputElement)) return false;
        if (t.id === "xp-supernatural-toggle") {
          xpState.includeSupernatural = t.checked;
          $("xp-supernatural-section").hidden = !t.checked;
          return true;
        }
        if (t.id === "xp-double-type1") {
          xpState.doubleType1 = t.checked;
          return true;
        }
        if (t.dataset.xpPath) {
          setPath(xpState, t.dataset.xpPath, window.MeyeXp.clampStat(t.value));
          if (
            t.dataset.xpPath === "basic.life" ||
            t.dataset.xpPath.startsWith("basic.physical.")
          ) {
            enforceLifeCap();
          }
          return true;
        }
        if (t.dataset.xpFlag) {
          setPath(xpState, t.dataset.xpFlag, t.checked);
          return true;
        }
        if (t.dataset.xpEarned) {
          xpState.earned[t.dataset.xpEarned] = window.MeyeXp.clampStat(t.value);
          return true;
        }
        if (t.dataset.skill != null && t.dataset.trans != null) {
          const si = Number(t.dataset.skill);
          const ti = Number(t.dataset.trans);
          if (xpState.supernatural.skills[si]) {
            xpState.supernatural.skills[si].transformations[ti] =
              window.MeyeXp.clampStat(t.value);
          }
          return true;
        }
        return false;
      }

      function readXpForm() {
        for (const input of $("xp-form").querySelectorAll("input")) {
          applyXpInput(input);
        }
      }

      function recalculateXp() {
        readXpForm();
        saveXpState();
        refreshXp();
      }

      function onXpFormUpdate(e) {
        if (xpHydrating) return;
        if (!applyXpInput(e.target)) return;
        saveXpState();
        refreshXp();
      }

      function wireNumericInputs(root) {
        for (const input of root.querySelectorAll('input[type="number"]')) {
          input.setAttribute("inputmode", "numeric");
          input.setAttribute("enterkeyhint", "done");
        }
      }

      function fillXpForm() {
        xpHydrating = true;
        try {
          $("xp-supernatural-toggle").checked = xpState.includeSupernatural;
          $("xp-double-type1").checked = Boolean(xpState.doubleType1);
          $("xp-supernatural-section").hidden = !xpState.includeSupernatural;
          for (const input of document.querySelectorAll("[data-xp-path]")) {
            const value = getPath(xpState, input.dataset.xpPath);
            input.value = String(value ?? 0);
          }
          for (const input of document.querySelectorAll("[data-xp-flag]")) {
            input.checked = Boolean(getPath(xpState, input.dataset.xpFlag));
          }
          $("xp-earned-basic").value = xpState.earned.basic ? String(xpState.earned.basic) : "";
          $("xp-earned-special").value = xpState.earned.special ? String(xpState.earned.special) : "";
          $("xp-earned-super").value = xpState.earned.supernatural
            ? String(xpState.earned.supernatural)
            : "";
          renderXpSkills();
          wireNumericInputs($("xp-form"));
          enforceLifeCap();
          refreshXp();
        } finally {
          xpHydrating = false;
        }
      }

      function refreshXp() {
        if (!window.MeyeXp) return;
        enforceLifeCap();
        const result = window.MeyeXp.calculateExperience({
          basic: xpState.basic,
          special: xpState.special,
          supernatural: xpState.supernatural,
          includeSupernatural: xpState.includeSupernatural,
        });

        $("xp-spent-basic").textContent = fmtXp(result.basic.total);
        $("xp-spent-special").textContent = fmtXp(result.special.total);
        $("xp-spent-super").textContent = xpState.includeSupernatural
          ? fmtXp(result.supernatural.total)
          : "—";
        $("xp-spent-total").textContent = fmtXp(result.total);

        const setLeft = (id, earned, spent, enabled = true) => {
          const el = $(id);
          if (!enabled || !earned) {
            el.textContent = "—";
            el.className = "remain";
            return;
          }
          const left = earned - spent;
          el.textContent = fmtXp(left);
          el.className = left < 0 ? "remain neg" : "remain ok";
        };
        setLeft("xp-left-basic", xpState.earned.basic, result.basic.total);
        setLeft("xp-left-special", xpState.earned.special, result.special.total);
        setLeft(
          "xp-left-super",
          xpState.earned.supernatural,
          result.supernatural.total,
          xpState.includeSupernatural
        );
        const earnedTotal =
          (xpState.earned.basic || 0) +
          (xpState.earned.special || 0) +
          (xpState.includeSupernatural ? xpState.earned.supernatural || 0 : 0);
        setLeft("xp-left-total", earnedTotal, result.total);

        const lifeHint = document.querySelector('[data-xp-hint="basic.life"]');
        if (lifeHint) {
          const nextBit =
            result.basic.life.next > 0
              ? ` · próximo <b>${fmtXp(result.basic.life.next)}</b>`
              : " · tope alcanzado";
          lifeHint.innerHTML = `gastado <b>${fmtXp(result.basic.life.spent)}</b>${nextBit}`;
        }
        const tankHint = document.querySelector('[data-xp-hint="special.energyTank"]');
        if (tankHint) {
          tankHint.innerHTML = hintText(
            result.special.energyTank.spent,
            result.special.energyTank.next
          );
        }

        const groupText = (group, extra = "") =>
          `Gastado: <b>${fmtXp(group.spent)}</b>${extra}`;
        const pairExtra = (group) =>
          ` · suma ${fmtXp(group.sum)} · próximo <b>${fmtXp(group.next)}</b>`;
        const avgExtra = (avg) => {
          const rounded = Math.round(avg * 10) / 10;
          return ` · promedio ${fmtXp(rounded)}`;
        };

        const phys = xpState.basic.physical;
        const coord = xpState.basic.coordination;
        const ment = xpState.basic.mental;
        const physAvg = window.MeyeXp.statAverage([
          phys.strength,
          phys.agility,
          phys.speed,
          phys.resistance,
        ]);
        const coordAvg = window.MeyeXp.statAverage([
          coord.precision,
          coord.calculation,
          coord.range,
          coord.reflexes,
        ]);
        const mentAvg = window.MeyeXp.statAverage([
          ment.intelligence,
          ment.wisdom,
          ment.concentration,
          ment.will,
        ]);

        const setDie = (key, avg) => {
          const el = document.querySelector(`[data-xp-die="${key}"]`);
          if (el) {
            const die = window.MeyeXp.dieForAverage(avg);
            el.textContent = die;
            el.title = `Promedio ${fmtXp(Math.round(avg * 10) / 10)} · ${die}`;
          }
        };
        setDie("basic.physical", physAvg);
        setDie("basic.coordination", coordAvg);
        setDie("basic.mental", mentAvg);

        document.querySelector('[data-xp-group="basic.physical"]').innerHTML =
          groupText(result.basic.physical, avgExtra(physAvg));
        document.querySelector('[data-xp-group="basic.mental"]').innerHTML =
          groupText(result.basic.mental, avgExtra(mentAvg));
        document.querySelector('[data-xp-group="basic.coordination"]').innerHTML =
          groupText(result.basic.coordination, avgExtra(coordAvg));
        document.querySelector('[data-xp-group="special.physical"]').innerHTML =
          groupText(result.special.physical, pairExtra(result.special.physical));
        document.querySelector('[data-xp-group="special.energy"]').innerHTML =
          groupText(result.special.energy, pairExtra(result.special.energy));
        document.querySelector('[data-xp-group="special.mental"]').innerHTML =
          groupText(result.special.mental, pairExtra(result.special.mental));

        const type1Talents = [
          xpState.basic.physical.talented,
          xpState.basic.coordination.talented,
          xpState.basic.mental.talented,
          xpState.special.energyTankTalented,
        ].filter(Boolean).length;
        const type2Talents = [
          xpState.special.physical.talented,
          xpState.special.mental.talented,
          xpState.special.energy.talented,
        ].filter(Boolean).length;
        const warnBits = [];
        if (xpState.doubleType1) {
          if (type1Talents !== 2) {
            warnBits.push(
              "Doble fuerte tipo 1: marca exactamente dos (físico, coordinación, mental o contenedor de energía)."
            );
          }
        } else if (type1Talents < 1) {
          warnBits.push(
            "Falta un fuerte de tipo 1 (físico, coordinación, mental o contenedor de energía)."
          );
        } else if (type1Talents > 1) {
          warnBits.push(
            "Más de un fuerte de tipo 1. Activa «Doble fuerte tipo 1» si el personaje tiene dos, o revisa los marcados."
          );
        }
        if (type2Talents < 1) {
          warnBits.push(
            "Falta un fuerte de tipo 2 (H. físicas, H. mentales o H. energía)."
          );
        } else if (type2Talents > 1) {
          warnBits.push(
            "Más de un fuerte de tipo 2. Solo personajes especiales pueden tener más de uno."
          );
        }
        const warnBox = $("xp-talent-warn");
        if (warnBox) {
          warnBox.hidden = warnBits.length === 0;
          warnBox.innerHTML = warnBits.map((m) => `<p>${m}</p>`).join("");
        }

        document.querySelectorAll("[data-xp-skill]").forEach((el) => {
          const i = Number(el.dataset.xpSkill);
          const skill = result.supernatural.skills[i];
          if (!skill) return;
          el.innerHTML = `Suma ${fmtXp(skill.sum)} · gastado <b>${fmtXp(
            skill.spent
          )}</b> · próximo <b>${fmtXp(skill.next)}</b>`;
        });
      }

      document.querySelectorAll("#app-nav button").forEach((b) => {
        b.addEventListener("click", () => setApp(b.dataset.app));
      });

      $("xp-form").addEventListener("submit", (e) => {
        e.preventDefault();
        recalculateXp();
      });
      $("xp-form").addEventListener("input", onXpFormUpdate);
      $("xp-form").addEventListener("change", onXpFormUpdate);
      $("xp-form").addEventListener("focusout", onXpFormUpdate);
      $("xp-form").addEventListener("keyup", onXpFormUpdate);

      $("xp-skills").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.addTrans != null) {
          xpState.supernatural.skills[Number(btn.dataset.addTrans)].transformations.push(0);
        } else if (btn.dataset.removeTrans) {
          const [si, ti] = btn.dataset.removeTrans.split(":").map(Number);
          const list = xpState.supernatural.skills[si].transformations;
          if (list.length > 1) list.splice(ti, 1);
        } else if (btn.dataset.removeSkill != null) {
          if (xpState.supernatural.skills.length > 1) {
            xpState.supernatural.skills.splice(Number(btn.dataset.removeSkill), 1);
          }
        } else return;
        saveXpState();
        renderXpSkills();
        wireNumericInputs($("xp-skills"));
        refreshXp();
      });

      $("xp-add-skill").addEventListener("click", () => {
        xpState.supernatural.skills.push({ transformations: [0] });
        saveXpState();
        renderXpSkills();
        wireNumericInputs($("xp-skills"));
        refreshXp();
      });

      $("xp-recalc").addEventListener("click", recalculateXp);

      $("xp-reset").addEventListener("click", () => {
        xpState = defaultXpState();
        saveXpState();
        fillXpForm();
      });

      fillXpForm();
      setApp(appFromHash(), { keepHash: true });
      scrollInfoAnchor();

      window.addEventListener("hashchange", () => {
        setApp(appFromHash(), { keepHash: true });
        scrollInfoAnchor();
      });

      window.addEventListener("pageshow", (e) => {
        if (!e.persisted) return;
        xpState = loadXpState();
        fillXpForm();
        setApp(appFromHash(), { keepHash: true });
        scrollInfoAnchor();
      });
      window.addEventListener("pagehide", () => {
        readXpForm();
        saveXpState();
      });
