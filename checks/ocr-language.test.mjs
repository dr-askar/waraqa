import {test} from 'node:test';
import assert from 'node:assert/strict';
import {languagesFromText} from '../dist/ocr-language-detect.js';
test('detects supported Latin languages from substantial text',()=>{
 const samples={eng:'This document contains important information about the meeting and the project.',fra:'Ce document contient des informations importantes sur la réunion et les documents personnels.',deu:'Dieses Dokument enthält wichtige Informationen über die Besprechung und die persönlichen Unterlagen.',spa:'Este documento contiene información importante sobre el proyecto y los documentos personales.',ita:'Questo documento contiene informazioni importanti sulla riunione e sui documenti personali.',por:'Este documento contém informações importantes sobre a reunião e os documentos pessoais.',tur:'Bu belge toplantı ve kişisel belgeler hakkında önemli bilgiler içeriyor.'};
 for(const [code,text] of Object.entries(samples))assert.deepEqual(languagesFromText(text).languages,[code]);
});
test('recognizes different writing systems and distinguishes Arabic from Persian',()=>{
 assert.deepEqual(languagesFromText('هذه وثيقة باللغة العربية لاختبار تحديد اللغة وقراءة النصوص المطبوعة').languages,['ara']);
 assert.deepEqual(languagesFromText('این یک سند فارسی برای بررسی زبان و تشخیص متن است').languages,['fas']);
 assert.deepEqual(languagesFromText('Этот документ содержит важную информацию о встрече и документах.').languages,['rus']);
 assert.deepEqual(languagesFromText('यह दस्तावेज़ महत्वपूर्ण जानकारी और व्यक्तिगत दस्तावेजों के बारे में है').languages,['hin']);
 assert.deepEqual(languagesFromText('これは日本語で書かれた文書です').languages,['jpn']);
 assert.deepEqual(languagesFromText('这是用于语言识别的中文文档').languages,['chi_sim']);
 assert.deepEqual(languagesFromText('이 문서는 언어 인식을 위한 한국어 문서입니다').languages,['kor']);
});
test('detects multiple languages and marks short, blank and excessive mixtures as uncertain',()=>{
 const text='This document contains important information about the meeting and the project.\nCe document contient des informations importantes sur la réunion et les documents personnels.\nهذه وثيقة باللغة العربية لاختبار تحديد اللغة وقراءة النصوص المطبوعة';
 assert.deepEqual(new Set(languagesFromText(text).languages),new Set(['eng','fra','ara']));
 for(const text of ['','OK','12345'])assert.equal(languagesFromText(text).uncertain,true);
 const excessive=languagesFromText(text+'\nЭтот документ содержит важную информацию о встрече и документах.');assert.equal(excessive.limited,true);assert.equal(excessive.languages.length,3);
});
