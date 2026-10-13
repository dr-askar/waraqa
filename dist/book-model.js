export function bookQuads(center = 0.5, axis = "vertical", bounds) {
  if (!Number.isFinite(center) || center < 0.15 || center > 0.85)
    throw Error("خط التقسيم خارج الحدود");
  if (bounds?.length === 4) {
    const [a, b, c, d] = bounds,
      lerp = (p, q, t) => ({
        x: p.x + (q.x - p.x) * t,
        y: p.y + (q.y - p.y) * t,
      });
    if (axis === "horizontal") {
      const top = (a.y + b.y) / 2,
        bottom = (c.y + d.y) / 2,
        t = Math.max(0.1, Math.min(0.9, (center - top) / (bottom - top))),
        left = lerp(a, d, t),
        right = lerp(b, c, t);
      return [
        [a, b, right, left],
        [left, right, c, d],
      ].map((q) => q.map((p) => ({ ...p })));
    }
    const left = (a.x + d.x) / 2,
      right = (b.x + c.x) / 2,
      t = Math.max(0.1, Math.min(0.9, (center - left) / (right - left))),
      top = lerp(a, b, t),
      bottom = lerp(d, c, t);
    return [
      [a, top, bottom, d],
      [top, b, c, bottom],
    ].map((q) => q.map((p) => ({ ...p })));
  }
  return axis === "horizontal"
    ? [
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: center },
          { x: 0, y: center },
        ],
        [
          { x: 0, y: center },
          { x: 1, y: center },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      ]
    : [
        [
          { x: 0, y: 0 },
          { x: center, y: 0 },
          { x: center, y: 1 },
          { x: 0, y: 1 },
        ],
        [
          { x: center, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: center, y: 1 },
        ],
      ];
}
export function bookSettings(value = {}) {
  value = value && typeof value === "object" ? value : {};
  const axis = value.axis === "horizontal" ? "horizontal" : "vertical",
    center =
      Number.isFinite(value.center) &&
      value.center >= 0.15 &&
      value.center <= 0.85
        ? value.center
        : 0.5;
  const bounds =
    Array.isArray(value.bounds) &&
    value.bounds.length === 4 &&
    value.bounds.every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.x <= 1 &&
        p.y >= 0 &&
        p.y <= 1,
    )
      ? value.bounds.map((p) => ({ x: p.x, y: p.y }))
      : null;
  const quads =
    Array.isArray(value.quads) &&
    value.quads.length === 2 &&
    value.quads.every(
      (q) =>
        Array.isArray(q) &&
        q.length === 4 &&
        q.every(
          (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1,
        ),
    )
      ? value.quads.map((q) => q.map((p) => ({ x: p.x, y: p.y })))
      : bookQuads(center, axis, bounds);
  return {
    axis,
    center,
    quads,
    bounds,
    rtl: value.rtl !== false,
    clean: !!value.clean,
    sides: [0, 1].map((i) => ({
      include: value.sides?.[i]?.include !== false,
      rotation: [0, 90, 180, 270].includes(value.sides?.[i]?.rotation)
        ? value.sides[i].rotation
        : 0,
      filter: ["original", "gray", "bw"].includes(value.sides?.[i]?.filter)
        ? value.sides[i].filter
        : "original",
    })),
  };
}
export function bookMetadata(value) {
  if (
    !value ||
    value.version !== 1 ||
    typeof value.sourceDocumentId !== "string" ||
    !Array.isArray(value.groups) ||
    value.groups.length > 40
  )
    return null;
  const seen = new Set(),
    groups = [];
  for (const g of value.groups) {
    if (
      !g ||
      typeof g.sourcePageId !== "string" ||
      seen.has(g.sourcePageId) ||
      typeof g.sourceHash !== "string"
    )
      continue;
    seen.add(g.sourcePageId);
    groups.push({
      sourcePageId: g.sourcePageId,
      sourceHash: g.sourceHash,
      settings: bookSettings(g.settings),
    });
  }
  return groups.length
    ? { version: 1, sourceDocumentId: value.sourceDocumentId, groups }
    : null;
}
export function bookSource(value) {
  return value &&
    typeof value.documentId === "string" &&
    typeof value.pageId === "string" &&
    [0, 1].includes(value.part)
    ? { documentId: value.documentId, pageId: value.pageId, part: value.part }
    : null;
}
export function replaceBookGroups(doc, groups, pages, expectedRev) {
  if (doc.deleted || doc.trashed || doc.rev !== expectedRev)
    throw Error("تغيّرت النسخة الجاهزة؛ أعد فتح التقسيم لحماية تعديلاتك");
  const affected = new Set(groups.map((g) => g.sourcePageId)),
    inserted = new Set(),
    result = [];
  const replacements = (id) =>
    pages
      .filter((p) => p.bookSource?.pageId === id)
      .map((p) => {
        const old = doc.pages.find(
          (x) =>
            x.bookSource?.pageId === id &&
            x.bookSource.part === p.bookSource.part,
        );
        return old
          ? {
              ...p,
              id: old.id,
              history: [
                ...(old.history || []),
                {
                  blob: old.blob,
                  width: old.width,
                  height: old.height,
                  ocr: old.ocr,
                  redacted: old.redacted,
                },
              ].slice(-3),
              redo: [],
            }
          : p;
      });
  for (const p of doc.pages) {
    const id = p.bookSource?.pageId;
    if (!affected.has(id)) {
      result.push(p);
      continue;
    }
    if (!inserted.has(id)) {
      result.push(...replacements(id));
      inserted.add(id);
    }
  }
  for (const g of groups)
    if (!inserted.has(g.sourcePageId))
      result.push(...replacements(g.sourcePageId));
  if (!result.length || result.length > 80)
    throw Error("اختر صفحة ناتجة واحدة على الأقل، وحتى 80 صفحة");
  const previous = doc.book.groups;
  return {
    ...doc,
    pages: result,
    book: {
      ...doc.book,
      groups: [
        ...previous.map(
          (g) => groups.find((n) => n.sourcePageId === g.sourcePageId) || g,
        ),
        ...groups.filter(
          (g) => !previous.some((old) => old.sourcePageId === g.sourcePageId),
        ),
      ],
    },
  };
}
