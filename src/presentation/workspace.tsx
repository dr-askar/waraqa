import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { t } from "../../dist/i18n.js";
import { icon } from "../../dist/ui.js";
import { categories, categoryLabels } from "../domain/documents";
export const toolGroups = [
  {
    label: "التقاط ومعالجة",
    tools: [
      ["scan", "مسح مستند", "scan"],
      ["id", "هوية بوجهين", "documents"],
      ["collage", "عدة صفحات في صفحة واحدة", "merge"],
      ["book", "مسح كتاب", "split"],
      ["mega", "مسح ممتد", "merge"],
      ["passport", "صور شخصية", "documents"],
      ["stamp", "ختم الوقت والموقع", "edit"],
      ["cleanup", "إصلاح الصورة", "enhance"],
    ],
  },
  {
    label: "نص وأدوات ذكية",
    tools: [
      ["ocr", "استخراج النص", "text"],
      ["assistant", "مساعد قراءة المستند", "text"],
      ["math", "معادلات بسيطة — تجريبي", "text"],
      ["signature", "التوقيع والطمس", "edit"],
    ],
  },
  {
    label: "تحويل وتصدير",
    tools: [
      ["export", "PDF وWord وExcel", "share"],
      ["pptx", "عرض PowerPoint", "documents"],
      ["long", "صورة طويلة", "merge"],
      ["compress", "ضغط PDF", "download"],
    ],
  },
];
type Actions = {
  tool: (id: string) => void;
  route: (id: string) => void;
  category: (id: string) => void;
};
function Glyph({ name }: { name: string }) {
  return (
    <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(name) }} />
  );
}
function Quick({ actions }: { actions: Actions }) {
  return (
    <div className="quick-grid" aria-label={t("الوصول السريع")}>
      {[
        ["scan", "مسح جديد", "scan"],
        ["import", "استيراد", "upload"],
        ["ocr", "استخراج النص", "text"],
        ["export", "تحويل الصيغ", "share"],
      ].map(([id, label, glyph]) => (
        <button key={id} onClick={() => actions.tool(id)} data-quick={id}>
          <Glyph name={glyph} />
          <span>{t(label)}</span>
        </button>
      ))}
    </div>
  );
}
function Tools({ actions }: { actions: Actions }) {
  const [query, setQuery] = React.useState(""),
    [groupIndex, setGroup] = React.useState(-1);
  const filtered = toolGroups
    .map((group, index) => ({
      ...group,
      index,
      tools: group.tools.filter(([, label]) =>
        t(label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    }))
    .filter(
      (group) =>
        group.tools.length && (groupIndex < 0 || groupIndex === group.index),
    );
  return (
    <>
      <div className="screen-heading">
        <small>{t("اختر الأداة، ثم المستند والصفحات")}</small>
        <h1>{t("الأدوات")}</h1>
      </div>
      <input
        id="tool-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("بحث عن أداة")}
        aria-label={t("بحث عن أداة")}
      />
      <div className="tool-filters">
        {["الكل", ...toolGroups.map((group) => group.label)].map(
          (label, index) => (
            <button
              key={label}
              aria-pressed={groupIndex === index - 1}
              onClick={() => setGroup(index - 1)}
            >
              {t(label)}
            </button>
          ),
        )}
      </div>
      {filtered.map((group) => (
        <section className="tool-section" key={group.label}>
          <h2>{t(group.label)}</h2>
          <div className="tools-grid">
            {group.tools.map(([id, label, glyph]) => (
              <button
                className="tool-tile"
                data-tool={id}
                key={id}
                onClick={() => actions.tool(id)}
              >
                <Glyph name={glyph} />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!filtered.length && <p>{t("لا توجد أدوات مطابقة")}</p>}
    </>
  );
}
function Nav({ actions }: { actions: Actions }) {
  return (
    <>
      {[
        ["home", "الرئيسية", "documents"],
        ["documents", "المستندات", "folder"],
        ["scan", "مسح جديد", "scan"],
        ["tools", "الأدوات", "enhance"],
        ["account", "حسابي", "settings"],
      ].map(([id, label, glyph]) => (
        <button
          key={id}
          id={
            id === "scan"
              ? "mobile-scan"
              : id === "account"
                ? "mobile-settings"
                : undefined
          }
          data-route={id}
          onClick={() =>
            id === "scan" ? actions.tool("scan") : actions.route(id)
          }
        >
          <Glyph name={glyph} />
          <span>{t(label)}</span>
        </button>
      ))}
    </>
  );
}
export function mountWorkspace(actions: Actions) {
  const roots: Root[] = [];
  function mount(id: string, element: React.ReactNode) {
    const root = createRoot(document.getElementById(id)!);
    roots.push(root);
    flushSync(() => root.render(element));
  }
  mount("quick-root", <Quick actions={actions} />);
  mount("tools-root", <Tools actions={actions} />);
  mount("workspace-nav", <Nav actions={actions} />);
  return {
    refresh: () => {
      flushSync(() => {
        roots[0].render(<Quick actions={actions} />);
        roots[1].render(<Tools actions={actions} />);
        roots[2].render(<Nav actions={actions} />);
      });
    },
    dispose: () => roots.forEach((root) => root.unmount()),
  };
}
export { categories, categoryLabels };
