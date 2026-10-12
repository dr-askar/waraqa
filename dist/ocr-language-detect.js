import {francAll} from './vendor/franc.mjs';
const latin={eng:'eng',fra:'fra',deu:'deu',spa:'spa',tur:'tur',ita:'ita',por:'por'};
export function probeLanguages(script){if(Array.isArray(script)){const codes=[...new Set(script.flatMap(s=>probeLanguages(s).split('+')))];return codes.slice(0,3).join('+')||'ara+eng';}return ({Latin:'ara+eng',Fraktur:'deu+eng',Arabic:'ara+fas+eng',Cyrillic:'rus+eng',Devanagari:'hin+eng',Han:'chi_sim+jpn+eng',Japanese:'jpn+eng',Hiragana:'jpn+eng',Katakana:'jpn+eng',Hangul:'kor+eng',Korean:'kor+eng'})[script]||'ara+eng';}
export function languagesFromText(text){
 const counts=new Map();let uncertain=false;const add=(code,n)=>counts.set(code,(counts.get(code)||0)+n),count=(value,pattern)=>(value.match(pattern)||[]).length;
 for(const line of text.split(/\n+/)){const arabicText=(line.match(/[\u0600-\u06ff\s]+/g)||[]).join(' '),letters=count(arabicText,/[\u0621-\u064a\u0671-\u06d3]/g);if(!letters)continue;const ranked=francAll(arabicText,{only:['arb','pes'],minLength:20}),strong=count(arabicText,/[پچژگ]/g);add(strong||ranked[0]?.[0]==='pes'?'fas':'ara',letters);if(letters<12)uncertain=true;}
 const cyrillic=count(text,/\p{Script=Cyrillic}/gu),devanagari=count(text,/\p{Script=Devanagari}/gu),hangul=count(text,/\p{Script=Hangul}/gu),kana=count(text,/[\p{Script=Hiragana}\p{Script=Katakana}]/gu),han=count(text,/\p{Script=Han}/gu);
 if(cyrillic)add('rus',cyrillic);if(devanagari)add('hin',devanagari);if(hangul)add('kor',hangul);if(kana)add('jpn',kana+han);else if(han)add('chi_sim',han);
 const latinLines=text.split(/\n+/).map(line=>(line.match(/[\p{Script=Latin}\p{M}\s.,;:'!?-]+/gu)||[]).join(' ').trim()).filter(line=>/\p{Script=Latin}/u.test(line));
 let classified=false;for(const line of latinLines){const letters=count(line,/\p{Script=Latin}/gu);if(letters<40)continue;const ranked=francAll(line,{only:Object.keys(latin),minLength:20});if(latin[ranked[0]?.[0]]){add(latin[ranked[0][0]],letters);classified=true;if((ranked[0][1]-(ranked[1]?.[1]||0))<.06)uncertain=true;}}
 if(!classified&&latinLines.length){const all=latinLines.join(' '),ranked=count(all,/\p{Script=Latin}/gu)>=40?francAll(all,{only:Object.keys(latin),minLength:40}):[];add(latin[ranked[0]?.[0]]||'eng',count(all,/\p{Script=Latin}/gu));uncertain=true;}
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]);return{languages:ranked.slice(0,3).map(([code])=>code),uncertain:uncertain||!ranked.length||ranked.length>3,limited:ranked.length>3};
}
export function recognitionText(data){return(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).map(l=>(l.words||[]).filter(w=>w.confidence>=35).map(w=>w.text).join(' ')))).join('\n')||data.text||'';}
