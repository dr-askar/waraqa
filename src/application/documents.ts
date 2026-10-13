import {assertAppend,isCategory,type DocumentRepository,type Page,type Category} from '../domain/documents';
export function createDocumentActions(repository:DocumentRepository){return{
 async categorize(id:string,category:Category){if(!isCategory(category))throw Error('تصنيف غير صالح');return repository.mutate(id,doc=>doc.deleted?null:{...doc,category});},
 async append(id:string,pages:Page[]){return repository.mutate(id,doc=>{assertAppend(doc,pages.length);return{...doc,pages:[...doc.pages,...pages]};});},
 async replaceImage(id:string,pageId:string,expected:string,replacement:Page){return repository.mutate(id,doc=>{assertAppend(doc,0);const page=doc.pages.find(p=>p.id===pageId);if(!page||(page.imageRevision||doc.rev)!==expected)throw Error('تغيّرت الصفحة؛ أعد فتح الأداة');return{...doc,pages:doc.pages.map(p=>p.id===pageId?replacement:p)};});}
};}
