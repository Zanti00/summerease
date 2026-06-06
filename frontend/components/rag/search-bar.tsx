"use client";

import React, { useState } from "react";
import { Search, SlidersHorizontal, Loader2, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface SearchBarProps {
  onSearch: (query: string, options: SearchOptions) => void;
  isLoading: boolean;
}

export interface SearchOptions {
  topK: number;
  threshold: number;
  fileTypes: string[] | null;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Search parameters
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.70);
  
  // File type selection
  const [pdfSelected, setPdfSelected] = useState(true);
  const [docxSelected, setDocxSelected] = useState(true);
  const [txtSelected, setTxtSelected] = useState(true);
  const [mdSelected, setMdSelected] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.length < 3) return;

    // Compile active file types
    const fileTypes: string[] = [];
    if (pdfSelected) fileTypes.push("application/pdf");
    if (docxSelected) fileTypes.push("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    if (txtSelected) fileTypes.push("text/plain");
    if (mdSelected) fileTypes.push("text/markdown");

    onSearch(query, {
      topK,
      threshold,
      fileTypes: fileTypes.length === 4 ? null : fileTypes // null means search all
    });
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question or enter keywords to search across documents..."
            className="pl-12 pr-4 py-6 bg-slate-950/40 border-slate-900 focus:border-violet-500/50 rounded-xl text-slate-200 text-sm focus:ring-1 focus:ring-violet-500/20 placeholder-slate-600 backdrop-blur-md transition-all duration-300"
            disabled={isLoading}
          />
        </div>

        <Button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className={`px-4 border-slate-900 hover:border-slate-800 ${
            showFilters ? "bg-violet-950/20 border-violet-900/50 text-violet-400" : "bg-slate-950/40 text-slate-400"
          }`}
          disabled={isLoading}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        <Button
          type="submit"
          disabled={isLoading || !query.trim() || query.length < 3}
          className="bg-violet-600 hover:bg-violet-500 text-white font-medium px-6 py-6 rounded-xl flex items-center space-x-2 shadow-lg shadow-violet-500/10 transition-all duration-300"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Query</span>
            </>
          )}
        </Button>
      </form>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-md">
          {/* Similarity Threshold Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400 font-medium">Similarity Threshold</label>
              <span className="text-violet-400 font-semibold">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Only matches above this similarity value will be retrieved</p>
          </div>

          {/* Top-K Chunks Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400 font-medium">Max Retrieval Matches</label>
              <span className="text-violet-400 font-semibold">{topK} chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Maximum number of matching passages to return</p>
          </div>

          {/* File Types Selection */}
          <div className="space-y-2.5">
            <label className="text-slate-400 font-medium text-xs flex items-center space-x-1.5">
              <Filter className="h-3 w-3 text-slate-500" />
              <span>Target Formats</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pdf"
                  checked={pdfSelected}
                  onCheckedChange={(checked) => setPdfSelected(!!checked)}
                />
                <label htmlFor="pdf" className="cursor-pointer">PDF</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="docx"
                  checked={docxSelected}
                  onCheckedChange={(checked) => setDocxSelected(!!checked)}
                />
                <label htmlFor="docx" className="cursor-pointer">DOCX</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="txt"
                  checked={txtSelected}
                  onCheckedChange={(checked) => setTxtSelected(!!checked)}
                />
                <label htmlFor="txt" className="cursor-pointer">Plain Text</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="md"
                  checked={mdSelected}
                  onCheckedChange={(checked) => setMdSelected(!!checked)}
                />
                <label htmlFor="md" className="cursor-pointer">Markdown</label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
