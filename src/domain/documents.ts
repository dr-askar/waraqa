export const categories = ['document','contract','card','receipt','book','photo','plan'] as const;
export type Category = typeof categories[number];
export const categoryLabels:Record<Category,string> = {document:'مستند',contract:'عقد',card:'بطاقة',receipt:'إيصال',book:'كتاب',photo:'صورة',plan:'مخطط'};
export interface Page {id:string; blob:Blob; original:Blob; width:number; height:number; imageRevision?:string; ocr?:{text:string;words:unknown[]}|null; [key:string]:unknown}
export interface Document {id:string;name:string;pages:Page[];rev:string;folder:string;category?:Category;deleted?:boolean;trashed?:boolean;[key:string]:unknown}
export interface DocumentRepository {get(id:string):Promise<Document|null>;list():Promise<Document[]>;mutate(id:string,change:(doc:Document)=>Document|null|Promise<Document|null>):Promise<Document|null>}
export function isCategory(value:unknown):value is Category{return categories.includes(value as Category);}
export function assertAppend(doc:Document,count:number){if(doc.deleted||doc.trashed)throw Error('المستند غير متاح للتعديل');if(doc.pages.length+count>80)throw Error('حد المستند 80 صفحة');}
