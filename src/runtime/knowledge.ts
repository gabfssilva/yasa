// src/runtime/knowledge.ts
import type { KnowledgeBaseManifest } from '../schemas/manifest.js';

/**
 * Documento processado da knowledge base
 */
export interface ProcessedDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Carrega e processa documentos inline de uma knowledge base
 */
export function loadInlineDocuments(kb: KnowledgeBaseManifest): ProcessedDocument[] {
  const documents: ProcessedDocument[] = [];

  for (const source of kb.knowledge_base.sources) {
    if (source.type === 'inline' && source.documents) {
      for (const doc of source.documents) {
        documents.push({
          id: `${kb.knowledge_base.id}/${doc.title}`,
          title: doc.title,
          content: doc.content,
          metadata: doc.metadata,
        });
      }
    }
  }

  return documents;
}

/**
 * Formata documentos da knowledge base como contexto para o prompt
 * Versão simplificada - em produção, usar embedding search
 */
export function formatKnowledgeAsContext(
  knowledgeBases: KnowledgeBaseManifest[]
): string {
  if (knowledgeBases.length === 0) {
    return '';
  }

  const sections: string[] = [];

  for (const kb of knowledgeBases) {
    const docs = loadInlineDocuments(kb);

    if (docs.length === 0) continue;

    sections.push(`## Base de Conhecimento: ${kb.knowledge_base.name}`);

    for (const doc of docs) {
      sections.push(`### ${doc.title}`);
      sections.push(doc.content.trim());
      sections.push(''); // linha em branco
    }
  }

  if (sections.length === 0) {
    return '';
  }

  return `
# Contexto de Conhecimento

Use as informações abaixo para responder perguntas do usuário quando relevante.

${sections.join('\n')}
`;
}

/**
 * Busca por documentos relevantes (versão simplificada)
 * Em produção, implementar busca semântica com embeddings
 */
export function searchKnowledge(
  knowledgeBases: KnowledgeBaseManifest[],
  query: string
): ProcessedDocument[] {
  const allDocs: ProcessedDocument[] = [];

  for (const kb of knowledgeBases) {
    allDocs.push(...loadInlineDocuments(kb));
  }

  // Busca simples por substring (case-insensitive)
  const queryLower = query.toLowerCase();
  return allDocs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(queryLower) ||
      doc.content.toLowerCase().includes(queryLower)
  );
}
