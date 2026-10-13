import { getDoc, saveDoc, mutateDoc, newDoc } from "./storage.js";
import { fingerprint } from "./processing-queue.js";
import { replaceBookGroups } from "./book-model.js";
export async function commitBook({ source, groups, pages, destination }) {
  const latest = await getDoc(source.id);
  if (!latest || latest.deleted || latest.trashed)
    throw Error("الصور الأصلية غير متاحة");
  for (const g of groups) {
    const p = latest.pages.find((p) => p.id === g.sourcePageId);
    if (!p || (await fingerprint(p.blob)) !== g.sourceHash)
      throw Error("تغيّرت الصورة الأصلية؛ أعد فتح التقسيم");
  }
  if (!pages.length || pages.length > 80)
    throw Error("اختر صفحة ناتجة واحدة على الأقل، وحتى 80 صفحة");
  if (destination) {
    const saved = await mutateDoc(destination.id, (d) =>
      replaceBookGroups(d, groups, pages, destination.rev),
    );
    if (!saved) throw Error("النسخة الجاهزة غير متاحة");
    return saved.id;
  }
  const result = {
    ...newDoc(source.name + " — نسخة جاهزة"),
    folder: source.folder,
    category: "book",
    pages,
    book: { version: 1, sourceDocumentId: source.id, groups },
  };
  await saveDoc(result);
  return result.id;
}
