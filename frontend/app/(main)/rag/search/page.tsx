"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SearchBar, SearchOptions } from "@/components/rag/search-bar";
import { SearchResults } from "@/components/rag/search-results";
import { searchRAGDocuments, SearchResponse } from "@/lib/api/rag";
import { LayoutDashboard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RAGSearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string, options: SearchOptions) => {
    setIsLoading(true);
    setQuery(searchQuery);
    setError(null);
    try {
      const results = await searchRAGDocuments(
        searchQuery,
        options.topK,
        options.threshold,
        options.fileTypes
      );
      setSearchResults(results);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to complete search query.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-row justify-between items-center pb-2">
        <PageHeader
          title="Semantic Document Query"
          subtitle="Retrieve contextually matching passages from your knowledge base"
          showUploadButton={false}
        />
        
        <Link href="/documents">
          <Button variant="outline" className="border-slate-900 bg-slate-950/40 text-slate-400 hover:text-slate-200 rounded-xl flex items-center space-x-2">
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span>Documents</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Search configuration inputs */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/30 p-4 rounded-xl">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Query Results listing */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-900/60 pb-3">
              <span className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-violet-500 animate-ping" />
                <span>Running vector similarity queries...</span>
              </span>
            </div>
            {/* Skeletal placeholders for loader */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-950/20 border border-slate-900/40 p-5 rounded-xl animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-900 rounded w-1/3" />
                  <div className="h-6 bg-slate-900 rounded-full w-20" />
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-900 rounded w-full" />
                  <div className="h-3.5 bg-slate-900 rounded w-5/6" />
                </div>
                <div className="h-3.5 bg-slate-900 rounded w-1/4 pt-1" />
              </div>
            ))}
          </div>
        ) : (
          <SearchResults results={searchResults} query={query} />
        )}
      </div>
    </div>
  );
}
