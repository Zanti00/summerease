import { getAuthToken } from "../actions/authActions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const BASE_RAG_URL = `${API_URL}/api/v1/rag`;

export interface RAGDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_status: string;
  processing_status: string;
  total_chunks: number;
  total_tokens: number;
  created_at: string;
  processing_completed_at?: string;
}

export interface SearchResultChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  chunk_index: number;
  token_count: number;
  metadata: Record<string, any>;
}

export interface ChunkScore {
  chunk_id: string;
  vector_similarity: number;
  keyword_score: number;
  final_score: number;
}

export interface SearchResponse {
  query: string;
  query_id: string;
  total_results: number;
  retrieval_time_ms: number;
  matched_chunks: SearchResultChunk[];
  scores: ChunkScore[];
  metadata: Record<string, any>;
}

export interface ProgressInfo {
  chunks_total: number;
  chunks_embedded: number;
  percentage: number;
}

export interface StatusResponse {
  document_id: string;
  upload_status: string;
  processing_status: string;
  progress: ProgressInfo;
  processing_started_at?: string;
  estimated_completion?: string;
}

export interface ChunkSchema {
  chunk_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata: Record<string, any>;
  has_embedding: boolean;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ChunksResponse {
  document_id: string;
  chunks: ChunkSchema[];
  pagination: PaginationInfo;
}

async function getHeaders(isMultipart = false) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Authorization: token ? `Bearer ${token}` : "",
  };
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function uploadRAGDocument(file: File): Promise<RAGDocument> {
  const headers = await getHeaders(true);
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_RAG_URL}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to upload document to RAG pipeline");
  }

  return res.json();
}

export async function listRAGDocuments(): Promise<{ documents: RAGDocument[]; total: number }> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_RAG_URL}/documents`, {
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to load RAG documents list");
  }

  return res.json();
}

export async function getRAGDocumentStatus(docId: string): Promise<StatusResponse> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_RAG_URL}/documents/${docId}/status`, {
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to check document status");
  }

  return res.json();
}

export async function deleteRAGDocument(docId: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_RAG_URL}/documents/${docId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to delete RAG document");
  }
}

export async function searchRAGDocuments(
  query: string,
  topK = 5,
  similarityThreshold = 0.70,
  fileTypes: string[] | null = null,
  documentIds: string[] | null = null
): Promise<SearchResponse> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_RAG_URL}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      top_k: topK,
      similarity_threshold: similarityThreshold,
      file_types: fileTypes,
      document_ids: documentIds,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Semantic search request failed");
  }

  return res.json();
}

export async function getRAGDocumentChunks(
  docId: string,
  page = 1,
  perPage = 20
): Promise<ChunksResponse> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_RAG_URL}/documents/${docId}/chunks?page=${page}&per_page=${perPage}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to retrieve document chunks");
  }

  return res.json();
}

/**
 * Stream a RAG-generated answer from the backend via Server-Sent Events.
 *
 * Connects to POST /api/v1/rag/generate and reads the SSE stream token-by-token.
 * Each token is delivered via the onToken callback, enabling real-time UI rendering.
 *
 * @param query - User's natural language question
 * @param documentIds - Optional scope to specific documents
 * @param onToken - Callback invoked for each token fragment
 * @param onDone - Callback invoked when generation completes
 * @param onError - Callback invoked on error (server or network)
 * @returns AbortController to allow cancellation of the stream
 */
export function streamRAGGeneration(
  query: string,
  documentIds: string[] | null,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    const headers = await getHeaders();
    try {
      const res = await fetch(`${BASE_RAG_URL}/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          document_ids: documentIds,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onError(errData.detail || "Generation request failed");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError("No response stream available");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.token) {
              onToken(parsed.token);
            }
          } catch {
            // Malformed JSON line — skip silently
          }
        }
      }

      onDone();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(err instanceof Error ? err.message : "Stream connection failed");
    }
  })();

  return controller;
}

/**
 * Stream a RAG-generated answer with tool-calling support.
 *
 * @param query - User's natural language question
 * @param documentHtml - Current HTML of the open document
 * @param onToken - Callback invoked for each regular text token
 * @param onToolResult - Callback invoked when the LLM returns a tool result
 * @param onDone - Callback invoked when generation completes
 * @param onError - Callback invoked on error
 * @returns AbortController to allow cancellation of the stream
 */
export function streamRAGGenerationWithTools(
  query: string,
  documentHtml: string | null,
  selectedHtml: string | null,
  onToken: (token: string) => void,
  onToolResult: (result: { action: string; new_content_html: string; action_summary: string; target_exact_text?: string }) => void,
  onDone: () => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    const headers = await getHeaders();
    try {
      const res = await fetch(`${BASE_RAG_URL}/generate-with-tools`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          document_content_html: documentHtml,
          selected_text_html: selectedHtml,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onError(errData.detail || "Generation request failed");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError("No response stream available");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.type === "token" && parsed.content) {
              onToken(parsed.content);
            } else if (parsed.tool_result) {
              onToolResult(parsed.tool_result);
            }
          } catch {
            // Malformed JSON line — skip silently
          }
        }
      }

      onDone();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(err instanceof Error ? err.message : "Stream connection failed");
    }
  })();

  return controller;
}
