import {getDoc,allDocs,mutateDoc} from '../../dist/storage.js';
import type {DocumentRepository} from '../domain/documents';
export const documentRepository:DocumentRepository={get:getDoc,list:allDocs,mutate:mutateDoc} as DocumentRepository;
