"use client";

import React from "react";
import { SearchResponse, SearchResultChunk, ChunkScore } from "@/lib/api/rag";
import { FileText, Award, Calendar, Layers, Clock, CornerDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SearchResultsProps {
  results: SearchResponse | null;
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (!results) return null;

  const { matched_chunks, scores, retrieval_time_ms, total_results } = results;

  if (total_results === 0) {
    return (
      <div className="text-center py-12 bg-slate-950/20 border border-slate-900/60 rounded-2xl backdrop-blur-md">
        <p className="text-slate-400 font-medium">No matches found above the threshold.</p>
        <p className="text-slate-600 text-xs mt-1">Try lowering the similarity threshold or refining your query terms.</p>
      </div>
    );
  }

  // Map scores by chunk_id for quick O(1) lookup
  const scoresMap = scores.reduce<Record<string, ChunkScore>>((acc, s) => {
    acc[s.chunk_id] = s;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Retrieval Stats Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-900/60 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="h-3.5 w-3.5" />
          <span>Found {total_results} matching passages</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Search latency: {retrieval_time_ms.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Results Chunks */}
      <div className="space-y-4">
        {matched_chunks.map((chunk, idx) => {
          const scoreDetail = scoresMap[chunk.chunk_id];
          const similarityPercent = scoreDetail 
            ? (scoreDetail.final_score * 100).toFixed(1) 
            : "0.0";
            
          const pageNum = chunk.metadata?.source_page;
          const headings = chunk.metadata?.heading_hierarchy as string[] | undefined;

          return (
            <Card
              key={chunk.chunk_id}
              className="bg-slate-950/40 border-slate-900/60 p-5 rounded-xl hover:border-slate-800/80 transition-all duration-300 backdrop-blur-md relative overflow-hidden group"
            >
              {/* Top Row: File Name and Similarity Score */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-md shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-slate-200 text-sm font-semibold group-hover:text-violet-400 transition-colors">
                      {chunk.document_title}
                    </h5>
                    
                    {/* Stepper Heading Hierarchy Path */}
                    {headings && headings.length > 0 && (
                      <div className="flex items-center text-[10px] text-slate-500 mt-0.5 space-x-1">
                        <CornerDownRight className="h-2.5 w-2.5 text-slate-600 shrink-0" />
                        <span className="truncate max-w-50 md:max-w-md">
                          {headings.join(" > ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Similarity Badge */}
                <div className="flex items-center space-x-1 bg-violet-950/30 border border-violet-900/40 text-violet-400 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                  <Award className="h-3.5 w-3.5 text-violet-400" />
                  <span>{similarityPercent}% Match</span>
                </div>
              </div>

              {/* Chunk Content */}
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-10 border-l border-slate-900 py-0.5 select-text mb-4">
                {chunk.content}
              </div>

              {/* Footer Metadata Badges */}
              <div className="flex items-center space-x-3 text-[10px] text-slate-500 pl-10">
                {pageNum !== undefined && (
                  <span className="bg-slate-900/60 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                    Page {pageNum}
                  </span>
                )}
                <span className="bg-slate-900/60 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                  {chunk.token_count} tokens
                </span>
                <span className="bg-slate-900/60 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                  Chunk {chunk.chunk_index}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
