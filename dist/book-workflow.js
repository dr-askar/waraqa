import * as Core from "./core.js";
import { detectBookSpread } from "./advanced-imaging.js";
import { bookQuads, bookSettings } from "./book-model.js";
import { commitBook } from "./book-repository.js";
import { getDoc, newPage } from "./storage.js";
import { fingerprint } from "./processing-queue.js";
import { t } from "./i18n.js";
const $ = (s) => document.querySelector(s);
export async function editSavedBook(id, deps, pageId) {
  const destination = await getDoc(id);
  if (!destination?.book) return deps.toast("لا يوجد أصل مرتبط");
  const source = await getDoc(destination.book.sourceDocumentId);
  if (!source || source.deleted || source.trashed)
    return deps.toast("الصور الأصلية غير متاحة؛ النسخة الجاهزة ما زالت محفوظة");
  const groups = destination.book.groups.filter(
      (g) => !pageId || g.sourcePageId === pageId,
    ),
    pages = groups.map((g) =>
      source.pages.find((p) => p.id === g.sourcePageId),
    );
  if (pages.some((p) => !p)) return deps.toast("إحدى الصور الأصلية غير متاحة");
  return openBookWorkflow({ ...source, pages }, deps, { destination, groups });
}
export async function openBookWorkflow(
  source,
  { modal, button, close, run, toast, cleanup, onSaved },
  { destination, groups = [] } = {},
) {
  if (!source.pages.length || source.pages.length > 40)
    return toast("اختر من صورة واحدة إلى 40 صورة");
  let active = true,
    index = 0,
    busy = false,
    bitmap,
    drag = null,
    cropPart = null,
    urls = [];
  const entries = source.pages.map((p) => ({
    page: p,
    settings: bookSettings(
      groups.find((g) => g.sourcePageId === p.id)?.settings ||
        p.bookCapture || { rtl: document.documentElement.dir === "rtl" },
    ),
    initialized:
      !!groups.find((g) => g.sourcePageId === p.id) || !!p.bookCapture,
    version: 0,
    results: null,
  }));
  modal(
    destination ? "تعديل تقسيم الكتاب" : "مسح كتاب — مراجعة الأصول",
    `
  <p class="hint">الأصول تبقى منفصلة. راجع خط التقسيم وحدود كل نصف، ثم الصفحات الجاهزة. الكشف تقديري ولا يفرد انحناء الكتاب.</p>
  <div class="book-navigation"><button id="book-prev" class="secondary">السابق</button><span id="book-position" role="status"></span><button id="book-next" class="secondary">التالي</button></div>
  <div class="form-row"><label>اتجاه التقسيم<select id="book-axis"><option value="vertical">عمودي — يمين ويسار</option><option value="horizontal">أفقي — أعلى وأسفل</option></select></label><label>موضع خط التقسيم (%)<input id="book-center" type="range" min="15" max="85" step=".5" value="50"></label></div>
  <div class="actions-wrap"><button id="book-auto" class="secondary">كشف هذه الصورة</button><button id="book-auto-all" class="secondary">كشف كل صورة مستقلاً</button><button id="book-apply-all" class="secondary">نفس التقسيم للصور المختارة</button></div>
  <label><input id="book-rtl" type="checkbox"> ترتيب القراءة من اليمين</label><label><input id="book-clean" type="checkbox"> تنظيف الخلفية والظلال</label>
  <p id="book-status" class="hint" role="status"></p>
  <div id="book-source-panel"><p class="hint">عدّل الخط الأزرق أولاً، ثم اسحب زوايا الإطار الأخضر والبرتقالي لضبط حدود كل نصف.</p><div class="book-source-board"><canvas id="book-source-canvas" tabindex="0" aria-label="خط التقسيم وحدود الصفحتين"></canvas></div><button id="book-review" class="primary">مراجعة الصفحات الناتجة</button></div>
  <div id="book-results" hidden><button id="book-back-source" class="secondary">رجوع لتعديل التقسيم</button><div class="book-result-grid">${[0, 1].map((part) => `<article><h3 data-book-heading="${part}"></h3><img data-book-result="${part}" alt="صفحة ناتجة"><label><input type="checkbox" data-book-include="${part}" checked> حفظ هذه الصفحة</label><div class="actions-wrap"><button class="secondary" data-book-rotate="${part}">تدوير 90°</button><button class="secondary" data-book-crop="${part}">قص هذه الصفحة</button></div><label>تحسين الصورة<select data-book-filter="${part}"><option value="original">ألوان أصلية</option><option value="gray">رمادي</option><option value="bw">أبيض وأسود</option></select></label></article>`).join("")}</div></div>`,
    [
      button(
        destination ? "تحديث النسخة الجاهزة" : "حفظ ككتاب جديد",
        save,
        true,
      ),
      button("إلغاء", close),
    ],
  );
  const canvas = $("#book-source-canvas");
  cleanup(() => {
    active = false;
    bitmap?.close();
    urls.forEach(URL.revokeObjectURL);
    canvas.width = canvas.height = 1;
  });
  function controls() {
    if (!active) return;
    $("#book-prev").disabled = busy || index === 0;
    $("#book-next").disabled = busy || index === entries.length - 1;
    for (const id of [
      "book-auto",
      "book-auto-all",
      "book-apply-all",
      "book-review",
    ])
      $("#" + id).disabled = busy;
    $("#modal-actions .primary").disabled = busy;
    for (const input of $("#modal-body").querySelectorAll(
      "input,select,[data-book-rotate],[data-book-crop]",
    ))
      input.disabled = busy;
  }
  function dirty() {
    const e = entries[index];
    e.version++;
    e.results = null;
    e.initialized = true;
  }
  function paint() {
    if (!active || !bitmap) return;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const s = entries[index].settings;
    for (const [part, q] of s.quads.entries()) {
      ctx.strokeStyle = part ? "#ea9634" : "#13966c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      q.forEach((p, i) =>
        i
          ? ctx.lineTo(p.x * canvas.width, p.y * canvas.height)
          : ctx.moveTo(p.x * canvas.width, p.y * canvas.height),
      );
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      for (const p of q) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "#3764ed";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    if (s.axis === "vertical") {
      ctx.moveTo(s.center * canvas.width, 0);
      ctx.lineTo(s.center * canvas.width, canvas.height);
    } else {
      ctx.moveTo(0, s.center * canvas.height);
      ctx.lineTo(canvas.width, s.center * canvas.height);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    canvas.dataset.settings = JSON.stringify(s);
  }
  function sync() {
    const s = entries[index].settings;
    $("#book-position").textContent = t("صورة {n} من {total}", {
      n: index + 1,
      total: entries.length,
    });
    $("#book-center").value = String(s.center * 100);
    $("#book-axis").value = s.axis;
    $("#book-rtl").checked = s.rtl;
    $("#book-clean").checked = s.clean;
    for (let p = 0; p < 2; p++) {
      $(`[data-book-include="${p}"]`).checked = s.sides[p].include;
      $(`[data-book-filter="${p}"]`).value = s.sides[p].filter;
      $(`[data-book-heading="${p}"]`).textContent =
        s.axis === "vertical"
          ? t(p ? "النصف الأيمن" : "النصف الأيسر")
          : t(p ? "النصف السفلي" : "النصف العلوي");
    }
    controls();
    paint();
  }
  async function detect(e) {
    const result = await detectBookSpread(e.page.blob, e.settings.axis);
    if (!active) return;
    e.settings.center = result.center;
    e.settings.bounds = result.bounds;
    e.settings.quads = bookQuads(result.center, e.settings.axis, result.bounds);
    e.initialized = true;
    e.version++;
    e.results = null;
    return result;
  }
  async function load() {
    busy = true;
    controls();
    const e = entries[index];
    try {
      bitmap?.close();
      bitmap = null;
      cropPart = null;
      $("#book-results").hidden = true;
      $("#book-source-panel").hidden = false;
      if (
        e.page.bookCapture &&
        !groups.some((g) => g.sourcePageId === e.page.id) &&
        !e.boundsLoaded
      ) {
        $("#book-status").textContent = t("جاري كشف حدود الكتاب…");
        const detection = await detectBookSpread(e.page.blob, e.settings.axis);
        if (!active) return;
        e.settings.bounds = detection.bounds;
        e.settings.quads = bookQuads(
          e.settings.center,
          e.settings.axis,
          detection.bounds,
        );
        e.boundsLoaded = true;
      }
      if (!e.initialized) {
        $("#book-status").textContent = t("جاري كشف حدود الكتاب…");
        const detection = await detect(e);
        if (active)
          $("#book-status").textContent = t(
            detection?.confidence > 0.4
              ? "تم اقتراح خط التقسيم؛ راجعه قبل الحفظ"
              : "الحد غير واضح؛ اضبط الخط يدوياً",
          );
      }
      const image = await Core.image(e.page.blob);
      if (!active) {
        image.close();
        return;
      }
      bitmap = image;
      const scale = Math.min(1, 850 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      sync();
    } catch (error) {
      if (active) toast(error.message);
    } finally {
      busy = false;
      controls();
    }
  }
  function position(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    };
  }
  canvas.onpointerdown = (event) => {
    if (busy) return;
    event.preventDefault();
    const p = position(event),
      s = entries[index].settings;
    const candidates = s.quads
      .flatMap((q, part) =>
        cropPart !== null && cropPart !== part
          ? []
          : q.map((corner, n) => ({
              part,
              n,
              d: Math.hypot(
                (corner.x - p.x) * canvas.clientWidth,
                (corner.y - p.y) * canvas.clientHeight,
              ),
            })),
      )
      .sort((a, b) => a.d - b.d);
    const seam =
      Math.abs((s.axis === "vertical" ? p.x : p.y) - s.center) *
      (s.axis === "vertical" ? canvas.clientWidth : canvas.clientHeight);
    drag =
      cropPart === null &&
      seam < 12 &&
      p.x > 0.08 &&
      p.x < 0.92 &&
      p.y > 0.08 &&
      p.y < 0.92
        ? { seam: true }
        : candidates[0].d < 25
          ? candidates[0]
          : null;
    if (drag) canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = (event) => {
    if (!drag || busy) return;
    event.preventDefault();
    const p = position(event),
      s = entries[index].settings;
    if (drag.seam) {
      s.center = Math.max(
        0.15,
        Math.min(0.85, s.axis === "vertical" ? p.x : p.y),
      );
      s.quads = bookQuads(s.center, s.axis, s.bounds);
      $("#book-center").value = String(s.center * 100);
    } else s.quads[drag.part][drag.n] = p;
    dirty();
    paint();
  };
  canvas.onpointerup = canvas.onpointercancel = () => (drag = null);
  canvas.onkeydown = (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
        event.key,
      ) ||
      busy
    )
      return;
    event.preventDefault();
    const s = entries[index].settings;
    s.center = Math.max(
      0.15,
      Math.min(
        0.85,
        s.center +
          (["ArrowLeft", "ArrowUp"].includes(event.key) ? -0.01 : 0.01),
      ),
    );
    s.quads = bookQuads(s.center, s.axis, s.bounds);
    dirty();
    sync();
  };
  $("#book-center").oninput = (event) => {
    const s = entries[index].settings;
    s.center = Number(event.target.value) / 100;
    s.quads = bookQuads(s.center, s.axis, s.bounds);
    dirty();
    paint();
  };
  $("#book-axis").onchange = (event) => {
    const s = entries[index].settings;
    s.axis = event.target.value;
    s.quads = bookQuads(s.center, s.axis, s.bounds);
    dirty();
    sync();
  };
  $("#book-rtl").onchange = (event) => {
    entries[index].settings.rtl = event.target.checked;
    dirty();
  };
  $("#book-clean").onchange = (event) => {
    entries[index].settings.clean = event.target.checked;
    dirty();
  };
  $("#book-prev").onclick = () => {
    index--;
    load();
  };
  $("#book-next").onclick = () => {
    index++;
    load();
  };
  $("#book-auto").onclick = () =>
    operation(async () => {
      const r = await detect(entries[index]);
      $("#book-status").textContent = t(
        r.confidence > 0.4
          ? "تم اقتراح خط التقسيم؛ راجعه قبل الحفظ"
          : "الحد غير واضح؛ اضبط الخط يدوياً",
      );
      sync();
    });
  $("#book-auto-all").onclick = () =>
    operation(async () => {
      for (const e of entries) {
        if (!active) return;
        await detect(e);
      }
      sync();
      $("#book-status").textContent = t("تم كشف كل صورة مستقلاً؛ راجع النتائج");
    });
  $("#book-apply-all").onclick = () => {
    const { axis, center, quads, bounds } = entries[index].settings;
    for (const e of entries) {
      e.settings = {
        ...e.settings,
        axis,
        center,
        bounds: structuredClone(bounds),
        quads: structuredClone(quads),
      };
      e.initialized = true;
      e.version++;
      e.results = null;
    }
    $("#book-status").textContent = t("طُبّق نفس التقسيم على الصور المختارة");
  };
  async function operation(task) {
    if (busy) return;
    busy = true;
    controls();
    try {
      await task();
    } catch (error) {
      if (active) toast(error.message);
    } finally {
      busy = false;
      controls();
    }
  }
  async function generate(e) {
    const version = e.version,
      s = bookSettings(e.settings);
    if (e.results) return e.results;
    const results = [];
    for (let part = 0; part < 2; part++) {
      if (!active) throw Error("أُغلقت المراجعة");
      let c = await Core.perspectiveCrop(e.page.blob, s.quads[part]);
      for (let n = 0; n < s.sides[part].rotation / 90; n++) {
        const old = c;
        c = await Core.rotate(await Core.toBlob(c));
        old.width = old.height = 1;
      }
      if (s.clean) {
        const scanner = await import("./scanner.js"),
          old = c;
        c = await scanner.cleanBackground(await Core.toBlob(c));
        old.width = old.height = 1;
      }
      if (s.sides[part].filter !== "original") {
        const old = c;
        c = await Core.enhance(await Core.toBlob(c), {
          filter: s.sides[part].filter,
          contrast: 10,
        });
        old.width = old.height = 1;
      }
      results.push({
        blob: await Core.toBlob(c),
        width: c.width,
        height: c.height,
        part,
      });
      c.width = c.height = 1;
    }
    if (version !== e.version) throw Error("تغيّرت الإعدادات؛ أعد المعاينة");
    e.results = results;
    return results;
  }
  async function review() {
    await operation(async () => {
      $("#book-status").textContent = t("جاري تجهيز المعاينة…");
      const results = await generate(entries[index]);
      if (!active) return;
      urls.forEach(URL.revokeObjectURL);
      urls = results.map((r) => URL.createObjectURL(r.blob));
      for (const r of results)
        $(`[data-book-result="${r.part}"]`).src = urls[r.part];
      $("#book-source-panel").hidden = true;
      $("#book-results").hidden = false;
      $("#book-status").textContent = t("عدّل كل صفحة أو استبعدها قبل الحفظ");
      sync();
    });
  }
  $("#book-review").onclick = review;
  $("#book-back-source").onclick = () => {
    cropPart = null;
    $("#book-results").hidden = true;
    $("#book-source-panel").hidden = false;
  };
  for (let part = 0; part < 2; part++) {
    $(`[data-book-include="${part}"]`).onchange = (event) => {
      entries[index].settings.sides[part].include = event.target.checked;
    };
    $(`[data-book-rotate="${part}"]`).onclick = () => {
      if (busy) return;
      const side = entries[index].settings.sides[part];
      side.rotation = (side.rotation + 90) % 360;
      dirty();
      review();
    };
    $(`[data-book-filter="${part}"]`).onchange = (event) => {
      entries[index].settings.sides[part].filter = event.target.value;
      dirty();
      review();
    };
    $(`[data-book-crop="${part}"]`).onclick = () => {
      cropPart = part;
      $("#book-results").hidden = true;
      $("#book-source-panel").hidden = false;
      $("#book-status").textContent = t(
        "عدّل زوايا نصف الصفحة ثم راجع النتيجة",
      );
      canvas.focus();
    };
  }
  async function save() {
    if (busy) return;
    busy = true;
    controls();
    let id;
    const success = await run("حفظ النسخة الجاهزة…", async () => {
      const pages = [],
        savedGroups = [];
      for (const e of entries) {
        if (!active) throw Error("أُغلقت المراجعة");
        if (!e.initialized) await detect(e);
        const results = await generate(e),
          parts =
            e.settings.rtl && e.settings.axis === "vertical" ? [1, 0] : [0, 1];
        for (const part of parts) {
          if (!e.settings.sides[part].include) continue;
          const r = results[part];
          pages.push({
            ...newPage(r.blob, r.width, r.height),
            sourceKind: "book-page",
            bookSource: { documentId: source.id, pageId: e.page.id, part },
          });
        }
        savedGroups.push({
          sourcePageId: e.page.id,
          sourceHash: await fingerprint(e.page.blob),
          settings: bookSettings(e.settings),
        });
      }
      id = await commitBook({
        source,
        groups: savedGroups,
        pages,
        destination,
      });
    });
    busy = false;
    controls();
    if (success && active) {
      close();
      onSaved(id);
    }
  }
  await load();
}
