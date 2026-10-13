import { stopLocal } from "./local-assistant.js";
import * as Core from "./core.js";
import * as Imaging from "./advanced-imaging.js";
import {
  extractiveSummary,
  answerFromDocument,
  simpleEquations,
} from "./document-reader.js";
import { newPage } from "./storage.js";
import { t } from "./i18n.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
export function createWorkspaceTools({
  getDocument,
  getDocuments,
  selectDocument,
  modal: showModal,
  button,
  close,
  run,
  append,
  download,
  toast,
  cleanup: onCleanup,
  openCamera,
  ocr,
  exportDoc,
  signature,
  getEpoch = () => 0,
  isOpen = () => true,
}) {
  const preview = async (blob, title) => {
    let url = URL.createObjectURL(blob);
    modal(
      title,
      `<img class="quality-preview" src="${url}" alt="${esc(t("معاينة الصفحة"))}">`,
      [button("إغلاق", close)],
    );
    cleanup(() => URL.revokeObjectURL(url));
  };
  let context = null,
    disposers = [];
  function cleanup(fn) {
    disposers.push(fn);
  }
  function modal(title, html, actions) {
    showModal(title, html, actions);
    disposers = [];
    onCleanup(() => {
      for (const fn of disposers.splice(0)) fn();
    });
    if (context) {
      const header = document.createElement("div");
      header.className = "tool-context";
      header.dataset.step = "3";
      const name = document.createElement("strong");
      name.textContent = context.source.name;
      const info = document.createElement("span");
      info.textContent = t("صفحة {n}", {
        n: context.pages
          .map((p) => context.source.pages.findIndex((x) => x.id === p.id) + 1)
          .join("، "),
      });
      const change = button("تغيير الصفحات", () =>
        pickPages(
          context.tool,
          context.source,
          context.pages.map((p) => p.id),
        ),
      );
      const step = document.createElement("small");step.textContent = "3 / 3 · " + t("الإعدادات");header.append(step, name, info, change);
      $("#modal-body").prepend(header);
    }
  }
  const names = {
    id: "هوية بوجهين",
    book: "مسح كتاب",
    stamp: "ختم الوقت والموقع",
    passport: "صور شخصية",
    mega: "مسح ممتد",
    long: "صورة طويلة",
    pptx: "عرض PowerPoint",
    assistant: "مساعد قراءة المستند",
    math: "معادلات بسيطة — تجريبي",
    cleanup: "إصلاح الصورة",
    signature: "التوقيع والطمس",
    ocr: "استخراج النص",
    export: "تحويل الصيغ",
    compress: "ضغط PDF",
  };
  const singles = new Set([
    "book",
    "stamp",
    "passport",
    "cleanup",
    "signature",
  ]);
  async function choose(tool) {
    context = null;
    if (tool === "scan") {
      openCamera();
      return;
    }
    if (tool === "import") {
      $("#files").click();
      return;
    }
    pickDocument(tool);
  }
  function pickDocument(tool) {
    context = null;
    const docs = getDocuments().filter((d) => !d.deleted && !d.trashed);
    modal(
      names[tool] || "الأدوات",
      `<p class="tool-step">1 / 3 · ${esc(t("اختر مستنداً"))}</p><label>${esc(t("بحث"))}<input id="tool-document-search" type="search" autocomplete="off"></label><div class="document-picker"></div><p id="tool-empty" hidden>${esc(t("لا توجد مستندات مطابقة"))}</p>`,
      [
        button("مسح جديد", () => {
          close();
          openCamera(["id", "book"].includes(tool) ? tool : "document");
        }),
        button("استيراد", () => {
          close();
          $("#files").click();
        }),
        button("إلغاء", close),
      ],
    );
    const urls = [];
    const root = $(".document-picker");
    for (const d of docs) {
      const b = document.createElement("button");
      b.dataset.pick = d.id;
      b.className = "tool-document";
      if (d.pages[0]) {
        const img = document.createElement("img");
        const url = URL.createObjectURL(d.pages[0].blob);
        urls.push(url);
        img.src = url;
        img.alt = "";
        img.loading = "lazy";
        b.append(img);
      }
      const text = document.createElement("span"),
        name = document.createElement("strong"),
        count = document.createElement("small");
      name.textContent = d.name;
      count.textContent = t("عدد الصفحات: {n}", { n: d.pages.length }) + " · " + (d.folder || t("المكتبة"));
      text.append(name, count);
      b.append(text);
      b.onclick = () => pickPages(tool, d);
      root.append(b);
    }
    const search = () => {
      const query = $("#tool-document-search").value.trim().toLocaleLowerCase();
      let visible = 0;
      for (const b of root.children) {
        b.hidden = !b.textContent.toLocaleLowerCase().includes(query);
        if (!b.hidden) visible++;
      }
      $("#tool-empty").hidden = visible > 0;
    };
    $("#tool-document-search").oninput = search;
    search();
    cleanup(() => urls.forEach((u) => URL.revokeObjectURL(u)));
  }
  function pickPages(tool, d, initial = []) {
    context = null;
    const single = singles.has(tool),
      limit = tool === "id" ? 2 : single ? 1 : tool === "mega" ? 12 : Infinity,
      min = ["id", "mega"].includes(tool) ? 2 : 1;
    const chosen = new Set(initial);
    modal(
      names[tool],
      `<p class="tool-step">2 / 3 · ${esc(t("اختر الصفحات"))}</p><strong data-user-content>${esc(d.name)}</strong><p class="hint">${esc(t(single ? "اختر صفحة واحدة" : tool === "id" ? "اختر الوجه الأمامي ثم الخلفي" : tool === "mega" ? "اختر من صفحتين إلى 12 صفحة" : "حدد الصفحات التي تريد العمل عليها"))}</p>${single || tool === "id" ? "" : '<button id="tool-select-all" class="secondary">' + esc(t("تحديد الكل")) + "</button>"}<div class="tool-pages"></div><p id="tool-selection-count" role="status"></p>`,
      [
        button(
          "متابعة",
          () => {
            const pages = [...chosen]
              .map((id) => d.pages.find((p) => p.id === id))
              .filter(Boolean);
            context = { tool, source: d, pages };
            return launch(tool, { ...d, pages });
          },
          true,
        ),
        button("رجوع للمستندات", () => pickDocument(tool)),
        button("إلغاء", close),
      ],
    );
    const urls = [],
      root = $(".tool-pages"),
      next = $("#modal-actions .primary");
    function update() {
      for (const b of root.children) {
        const on = chosen.has(b.dataset.pagePick);
        b.setAttribute("aria-pressed", String(on));
        b.querySelector("small").textContent =
          on && tool === "id"
            ? t(
                [...chosen].indexOf(b.dataset.pagePick) === 0
                  ? "الوجه الأمامي"
                  : "الوجه الخلفي",
              )
            : "";
      }
      next.disabled = chosen.size < min || chosen.size > limit;
      $("#tool-selection-count").textContent = t("تم تحديد {n} صفحة", {
        n: chosen.size,
      });
    }
    for (const [i, p] of d.pages.entries()) {
      const b = document.createElement("button");
      b.dataset.pagePick = p.id;
      b.className = "tool-page";
      const img = document.createElement("img"),
        label = document.createElement("span"),
        role = document.createElement("small");
      const url = URL.createObjectURL(p.blob);
      urls.push(url);
      img.src = url;
      img.alt = "";
      img.loading = "lazy";
      label.textContent = t("صفحة {n}", { n: i + 1 });
      b.append(img, label, role);
      b.onclick = () => {
        if (chosen.has(p.id)) chosen.delete(p.id);
        else {
          if (single) chosen.clear();
          if (chosen.size >= limit)
            return toast(t("الحد الأقصى: {n} صفحة", { n: limit }));
          chosen.add(p.id);
        }
        update();
      };
      root.append(b);
    }
    if ($("#tool-select-all"))
      $("#tool-select-all").onclick = () => {
        if (chosen.size === Math.min(d.pages.length, limit)) chosen.clear();
        else {
          chosen.clear();
          d.pages.slice(0, limit).forEach((p) => chosen.add(p.id));
        }
        update();
      };
    update();
    cleanup(() => urls.forEach((u) => URL.revokeObjectURL(u)));
  }
  async function launch(tool, d) {
    const source = context.source;
    if (["ocr", "export", "compress", "signature"].includes(tool)) {
      selectDocument(
        d.id,
        d.pages.map((p) => p.id),
      );
      if (tool === "ocr")
        ocr(d.pages.length === 1 ? d.pages[0].id : d.pages.map((p) => p.id));
      else if (tool === "signature") await signature(d.pages[0].id);
      else {
        exportDoc();
        $("#selected-export").checked = true;
        $("#selected-export").dispatchEvent(new Event("change"));
        if (tool === "compress") {
          $("#export-profile").value = "small";
          $("#export-profile").dispatchEvent(new Event("change"));
        }
      }
      const summary = document.createElement("p");
      summary.className = "tool-context";
      summary.textContent =
        d.name + " · " + t("تم تحديد {n} صفحة", { n: d.pages.length });
      summary.append(
        button("تغيير الصفحات", () =>
          pickPages(
            tool,
            source,
            d.pages.map((p) => p.id),
          ),
        ),
      );
      $("#modal-body").prepend(summary);
      return;
    }
    if (tool === "id") identity(d);
    else if (tool === "book") book(d);
    else if (tool === "stamp") stamp(d);
    else if (tool === "passport") passport(d);
    else if (tool === "mega") mega(d);
    else if (tool === "long") long(d);
    else if (tool === "pptx") pptx(d);
    else if (tool === "assistant") reader(d);
    else if (tool === "math") math(d);
    else if (tool === "cleanup") repair(d);
    if (tool === "id") $("#id-front").closest(".form-row").hidden = true;
    if (tool === "mega") $(".mega-pick").hidden = true;
    const selects = $("#modal-body").querySelectorAll('select[id$="-page"]');
    for (const select of selects) select.closest("label").hidden = true;
  }
  const pageOptions = (d) =>
    d.pages
      .map(
        (p, i) =>
          `<option value="${i}">${t("صفحة {n}", { n: context ? context.source.pages.findIndex((x) => x.id === p.id) + 1 : i + 1 })}</option>`,
      )
      .join("");
  function identity(d) {
    modal(
      "هوية بوجهين",
      `<p class="hint">اختر صورة الوجه الأمامي والخلفي بعد تصويرهما أو استيرادهما. تُضاف صفحة A4 وتبقى الأصول محفوظة.</p><div class="form-row"><label>الوجه الأمامي<select id="id-front">${pageOptions(d)}</select></label><label>الوجه الخلفي<select id="id-back">${pageOptions(d)}</select></label></div><button id="id-camera" class="secondary">تصوير الوجهين</button><p class="hint">يمكنك تعديل موضع كل وجه لاحقاً بأداة صفحتان في صفحة.</p>`,
      [
        button("معاينة", async () => {
          const front = Number($("#id-front").value),
            back = Number($("#id-back").value);
          if (front === back) return toast("اختر صفحتين مختلفتين");
          await guardedPreview(
            () => Imaging.identityPage(d.pages[front].blob, d.pages[back].blob),
            "هوية بوجهين",
            d.id,
            "card",
          );
        }),
        button("إلغاء", close),
      ],
    );
    if (d.pages.length > 1) $("#id-back").value = "1";
    $("#id-camera").onclick = () => {
      close();
      openCamera("id");
    };
  }
  let pendingPreview = null;
  async function guardedPreview(calculate, title, id, category) {
    const epoch = getEpoch();
    if (pendingPreview === epoch) return;
    pendingPreview = epoch;
    const controls = [...$('#modal-actions').querySelectorAll('button')].filter(b => b.textContent.includes(t('معاينة')));
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = t('جاري تجهيز المعاينة…');
    $('#modal-body').append(status);
    controls.forEach(b => b.disabled = true);
    try {
      const canvas = await calculate();
      if (isOpen() && getEpoch() === epoch) await showCanvas(canvas, title, id, category);
    } finally {
      status.remove();
      controls.forEach(b => b.disabled = false);
      if (pendingPreview === epoch) pendingPreview = null;
    }
  }
  async function showCanvas(canvas, title, id, category) {
    const epoch = getEpoch(),
      blob = await Core.toBlob(canvas);
    if (!isOpen() || epoch !== getEpoch()) return;
    const url = URL.createObjectURL(blob),
      body = $("#modal-body"),
      actions = $("#modal-actions"),
      panel = document.createElement("section");
    panel.className = "tool-result";
    panel.innerHTML = `<img class="quality-preview" src="${url}" alt="${esc(t("معاينة الصفحة"))}"><p>${esc(t("تُضاف نسخة جديدة إلى"))} <strong data-user-content>${esc(context?.source.name || "")}</strong></p><p class="hint">${esc(t("تبقى الصفحات الأصلية محفوظة"))}</p>`;
    const previous = [...actions.children];
    previous.forEach((b) => (b.hidden = true));
    body.classList.add("tool-previewing");
    body.append(panel);
    const save = button(
        "إضافة الصفحة",
        () => {
          close();
          run("حفظ…", async () =>
            append(
              id,
              [
                {
                  ...newPage(blob, canvas.width, canvas.height),
                  sourceKind: title === "صور شخصية" ? "passport" : "derived",
                },
              ],
              category,
            ),
          );
        },
        true,
      ),
      back = button("تعديل الإعدادات", () => {
        panel.remove();
        body.classList.remove("tool-previewing");
        save.remove();
        back.remove();
        previous.forEach((b) => (b.hidden = false));
        URL.revokeObjectURL(url);
      });
    actions.append(save, back);
    cleanup(() => {
      body.classList.remove("tool-previewing");
      URL.revokeObjectURL(url);
    });
    panel.scrollIntoView({ block: "start" });
  }
  function book(d) {
    let active = true,
      sourceUrl;
    const page = d.pages[0];
    modal(
      "مسح كتاب",
      `<p class="hint">خط المنتصف تقديري. عدّله قبل تقسيم الصفحتين. هذه الأداة لا تفرد انحناء الورق.</p><label>اختر صفحة<select id="book-page">${pageOptions(d)}</select></label><label>خط المنتصف (%)<input id="book-center" type="range" min="15" max="85" step="0.5" value="50"></label><label><input id="book-rtl" type="checkbox" checked> ترتيب الأجزاء من اليمين لليسار</label><label><input id="book-clean" type="checkbox"> تنظيف الخلفية والظلال</label><div class="book-preview"><img id="book-image" alt="معاينة الكتاب"><i id="book-seam"></i></div>`,
      [
        button(
          "إضافة الصفحات",
          () => {
            const page = d.pages[Number($("#book-page").value)],
              options = {
                center: Number($("#book-center").value) / 100,
                rtl: $("#book-rtl").checked,
                clean: $("#book-clean").checked,
              };
            close();
            run("حفظ الصفحات…", async () => {
              const canvases = await Imaging.splitBook(page.blob, options);
              const pages = [];
              for (const c of canvases)
                pages.push(newPage(await Core.toBlob(c), c.width, c.height));
              await append(d.id, pages, "book");
            });
          },
          true,
        ),
        button("إلغاء", close),
      ],
    );
    async function update() {
      const page = d.pages[Number($("#book-page").value)];
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = URL.createObjectURL(page.blob);
      $("#book-image").src = sourceUrl;
      const center = await Imaging.findBookCenter(page.blob);
      if (!active) return;
      $("#book-center").value = String(center * 100);
      $("#book-seam").style.left = center * 100 + "%";
    }
    $("#book-page").onchange = () => update().catch((e) => toast(e.message));
    $("#book-center").oninput = (e) =>
      ($("#book-seam").style.left = e.target.value + "%");
    cleanup(() => {
      active = false;
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    });
    update().catch((e) => toast(e.message));
  }
  function stamp(d) {
    modal(
      "ختم الوقت والموقع",
      `<label>اختر صفحة<select id="stamp-page">${pageOptions(d)}</select></label><label>نص الختم<input id="stamp-text" maxlength="120" value="${esc(new Date().toLocaleString(document.documentElement.lang))}"></label><label>الموقع — اختياري<input id="stamp-location" maxlength="150"></label><button id="stamp-gps" class="secondary">إضافة إحداثيات موقعي</button><label>الموضع<select id="stamp-position"><option value="bottom">أسفل</option><option value="top">أعلى</option></select></label><p class="hint">الموقع يُطلب عند الضغط فقط. الإحداثيات التي تضيفها ستظهر في الصورة المصدّرة.</p>`,
      [
        button("معاينة", async () => {
          const page = d.pages[Number($("#stamp-page").value)],
            options = {
              text: $("#stamp-text").value,
              location: $("#stamp-location").value,
              position: $("#stamp-position").value,
            };
          await guardedPreview(
            () => Imaging.stampPage(page.blob, options),
            "ختم الوقت والموقع",
            d.id,
          );
        }),
        button("إلغاء", close),
      ],
    );
    let active = true;
    cleanup(() => {
      active = false;
    });
    $("#stamp-gps").onclick = () => {
      if (!navigator.geolocation) return toast("الموقع غير متاح");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (active && $("#stamp-location"))
            $("#stamp-location").value =
              position.coords.latitude.toFixed(5) +
              ", " +
              position.coords.longitude.toFixed(5);
        },
        () => toast("تعذر تحديد الموقع؛ يمكنك إدخاله يدوياً"),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    };
  }
  function passport(d) {
    modal(
      "صور شخصية",
      `<p class="hint">قص مركزي وقالب طباعة، بدون إزالة الخلفية تلقائياً. راجع شروط الصورة للجهة المطلوبة.</p><label>اختر صفحة<select id="passport-page">${pageOptions(d)}</select></label><div class="form-row"><label>العرض (mm)<input id="passport-width" type="number" min="20" max="100" value="35"></label><label>الارتفاع (mm)<input id="passport-height" type="number" min="20" max="100" value="45"></label><label>عدد الصور<input id="passport-count" type="number" min="1" max="12" value="6"></label></div>`,
      [
        button("معاينة", async () => {
          const page = d.pages[Number($("#passport-page").value)],
            options = {
              widthMM: Number($("#passport-width").value),
              heightMM: Number($("#passport-height").value),
              copies: Number($("#passport-count").value),
            };
          try {
            await guardedPreview(
              () => Imaging.passportSheet(page.blob, options),
              "صور شخصية",
              d.id,
              "photo",
            );
          } catch (e) {
            toast(e.message);
          }
        }),
        button("إلغاء", close),
      ],
    );
  }
  function mega(d) {
    modal(
      "مسح ممتد",
      `<p class="hint">دمج أجزاء مرتبة بتداخل قابل للتعديل. هذه النسخة لا تطابق المنظور تلقائياً ولا تضمن دقة القياس الهندسي.</p><div class="mega-pick">${d.pages.map((p, i) => `<label><input type="checkbox" data-mega-page="${i}" checked>${t("صفحة {n}", { n: i + 1 })}</label>`).join("")}</div><label>الاتجاه<select id="mega-axis"><option value="vertical">عمودي</option><option value="horizontal">أفقي</option></select></label><label>التداخل (%)<input id="mega-overlap" type="range" min="0" max="50" value="15"></label><label>عرض الجزء (px)<select id="mega-width"><option value="1000">1000</option><option value="1600">1600</option><option value="800">800</option></select></label>`,
      [
        button("معاينة", async () => {
          const pages = [
              ...$("#modal-body").querySelectorAll("[data-mega-page]:checked"),
            ].map((input) => d.pages[Number(input.dataset.megaPage)]),
            options = {
              axis: $("#mega-axis").value,
              overlap: Number($("#mega-overlap").value) / 100,
              width: Number($("#mega-width").value),
            };
          try {
            await guardedPreview(
              () => Imaging.megaPage(pages, options),
              "مسح ممتد",
              d.id,
              "plan",
            );
          } catch (e) {
            toast(e.message);
          }
        }),
        button("إلغاء", close),
      ],
    );
  }
  function long(d) {
    modal(
      "صورة طويلة",
      `<p class="hint">الصور الكبيرة تُقسّم إلى ملفات متعددة لتجنب استهلاك الذاكرة.</p><label>العرض (px)<select id="long-width"><option value="900">900</option><option value="600">600</option><option value="1200">1200</option></select></label>`,
      [
        button(
          "تنزيل الملف",
          () => {
            const width = Number($("#long-width").value);
            run("تجهيز الملف…", async () => {
              const images = await Imaging.longImages(d.pages, { width });
              images.forEach((blob, i) =>
                download(
                  blob,
                  d.name.replace(/[\\/:*?"<>|]/g, "_") +
                    "-long-" +
                    (i + 1) +
                    ".jpg",
                ),
              );
            });
          },
          true,
        ),
        button("إلغاء", close),
      ],
    );
  }
  function pptx(d) {
    modal(
      "عرض PowerPoint",
      '<p class="hint">كل صفحة تصبح شريحة بصورة. النص داخل الصور لا يصبح قابلاً للتعديل.</p>',
      [
        button(
          "تنزيل الملف",
          () =>
            run("تجهيز الملف…", async () => {
              const { default: Pptx } = await import("./vendor/pptxgen.mjs");
              const pptx = new Pptx();
              pptx.layout = "LAYOUT_WIDE";
              pptx.title = d.name;
              for (const p of d.pages) {
                const bitmap = await Core.image(p.blob);
                let blob;
                try {
                  const scale = Math.min(
                      1,
                      1600 / Math.max(bitmap.width, bitmap.height),
                    ),
                    c = Core.makeCanvas(
                      bitmap.width * scale,
                      bitmap.height * scale,
                    );
                  c.getContext("2d").drawImage(bitmap, 0, 0, c.width, c.height);
                  blob = await Core.toBlob(c);
                } finally {
                  bitmap.close();
                }
                const slide = pptx.addSlide(),
                  r = Core.fitRect(p.width, p.height, {
                    x: 0.2,
                    y: 0.2,
                    w: 12.933,
                    h: 7.1,
                  });
                slide.addImage({
                  data: await Core.blobData(blob),
                  x: r.x,
                  y: r.y,
                  w: r.w,
                  h: r.h,
                });
              }
              const blob = await pptx.write({ outputType: "blob" });
              download(blob, d.name.replace(/[\\/:*?"<>|]/g, "_") + ".pptx");
            }),
          true,
        ),
        button("إلغاء", close),
      ],
    );
  }
  function reader(d) {
    let active = true;
    modal(
      "مساعد قراءة المستند",
      `<p class="hint">المساعد الأساسي يعرض مقاطع من النص المحفوظ، وليس إجابات مولّدة. كل نتيجة مرتبطة بصفحتها.</p><label>سؤالك<input id="reader-question" maxlength="500"></label><div class="actions-wrap"><button id="reader-ask" class="primary">بحث في المستند</button><button id="reader-summary" class="secondary">مقاطع مختصرة</button><button id="reader-ai" class="secondary">مساعد توليدي محلي — تجريبي</button></div><div id="reader-results" data-user-content></div><p id="reader-status" class="hint"></p>`,
      [button("إغلاق", close)],
    );
    function show(passages) {
      const root = $("#reader-results");
      root.replaceChildren();
      if (!passages.length) {
        root.textContent = t(
          "لا توجد مقاطع مطابقة؛ راجع السؤال أو استخرج النص أولاً",
        );
        return;
      }
      for (const p of passages) {
        const article = document.createElement("article"),
          link = document.createElement("button"),
          text = document.createElement("p");
        text.textContent = p.text;
        link.textContent = t("صفحة {n}", { n: p.page });
        link.onclick = () => {
          close();
          selectDocument(d.id);
          ocr(p.pageId);
        };
        article.append(text, link);
        root.append(article);
      }
    }
    $("#reader-ask").onclick = () =>
      show(answerFromDocument(d.pages, $("#reader-question").value));
    $("#reader-summary").onclick = () => show(extractiveSummary(d.pages));
    $("#reader-ai").onclick = async () => {
      const question = $("#reader-question").value.trim();
      if (!question) return toast("اكتب سؤالاً أولاً");
      const adapter = await navigator.gpu?.requestAdapter?.();
      if (!active) return;
      if (!adapter) return toast("هذا الجهاز لا يدعم WebGPU للمساعد المحلي");
      $("#reader-status").textContent = t(
        "يتطلب تنزيل نموذج كبير على الجهاز. لا تُرسل نصوصك لخدمة خارجية.",
      );
      const consent = button("تنزيل النموذج وتشغيله", async () => {
        consent.disabled = true;
        try {
          const llm = await import("./local-assistant.js"),
            answer = await llm.askLocal(d.pages, question, (status) => {
              if (active && $("#reader-status"))
                $("#reader-status").textContent = status;
            });
          if (active) {
            show(answer.passages);
            const p = document.createElement("p");
            p.textContent = answer.text;
            $("#reader-results").prepend(p);
            $("#reader-status").textContent = t(
              "إجابة مولّدة تجريبية؛ راجع المقاطع الأصلية ولا تعتمد عليها وحدها",
            );
          }
        } catch (e) {
          if (active) $("#reader-status").textContent = e.message;
        } finally {
          if (active) consent.disabled = false;
        }
      });
      $("#reader-results").replaceChildren(consent);
    };
    cleanup(() => {
      active = false;
      stopLocal();
    });
  }
  function math(d) {
    const equations = simpleEquations(
      d.pages.map((p) => p.ocr?.text || "").join("\n"),
    );
    modal(
      "معادلات بسيطة — تجريبي",
      `<p class="hint">استخراج قواعدي لمعادلات بسيطة من OCR المحفوظ. الكسور المركّبة والخط اليدوي تحتاج نموذج Math OCR متخصصاً غير مدمج حالياً.</p><label>LaTeX قابل للتعديل<textarea id="math-latex" dir="ltr">${esc(equations[0]?.latex || "")}</textarea></label><button id="math-render" class="secondary">معاينة المعادلة</button><div id="math-preview" data-user-content></div><div id="math-found" data-user-content></div>`,
      [
        button("تنزيل TXT", () =>
          download(
            new Blob([$("#math-latex").value], { type: "text/plain" }),
            d.name + "-math.txt",
          ),
        ),
        button("إغلاق", close),
      ],
    );
    for (const equation of equations) {
      const b = button(equation.text, () => {
        $("#math-latex").value = equation.latex;
        $("#math-render").click();
      });
      $("#math-found").append(b);
    }
    let active = true;
    cleanup(() => {
      active = false;
    });
    $("#math-render").onclick = async () => {
      const value = $("#math-latex").value;
      try {
        const { default: katex } = await import("./vendor/katex.mjs");
        if (active)
          katex.render(value, $("#math-preview"), {
            throwOnError: false,
            trust: false,
            strict: "warn",
          });
      } catch (e) {
        toast(e.message);
      }
    };
  }
  function repair(d) {
    modal(
      "إصلاح الصورة",
      `<p class="hint">تعبئة مستطيل بلون محيطه، مناسبة لخلفيات بسيطة. لا تستعيد تفاصيل محذوفة ولا تمثل طمساً آمناً.</p><label>اختر صفحة<select id="repair-page">${pageOptions(d)}</select></label><div class="form-row">${[
        ["x", "المكان الأفقي (%)", 20],
        ["y", "المكان العمودي (%)", 20],
        ["w", "العرض (%)", 10],
        ["h", "الارتفاع (%)", 10],
      ]
        .map(
          ([key, label, value]) =>
            `<label>${label}<input id="repair-${key}" type="number" min="0" max="100" value="${value}"></label>`,
        )
        .join("")}</div>`,
      [
        button("معاينة", async () => {
          const page = d.pages[Number($("#repair-page").value)],
            rect = {
              x: Math.round((Number($("#repair-x").value) / 100) * page.width),
              y: Math.round((Number($("#repair-y").value) / 100) * page.height),
              w: Math.round((Number($("#repair-w").value) / 100) * page.width),
              h: Math.round((Number($("#repair-h").value) / 100) * page.height),
            };
          try {
            await guardedPreview(
              () => Imaging.repairImage(page.blob, rect),
              "إصلاح الصورة",
              d.id,
            );
          } catch (e) {
            toast(e.message);
          }
        }),
        button("إلغاء", close),
      ],
    );
  }
  return { choose };
}
