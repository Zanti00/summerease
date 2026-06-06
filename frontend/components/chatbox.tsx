"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  Square,
} from "lucide-react";
import { streamRAGGeneration } from "@/lib/api/rag";
import { toast } from "sonner";

interface ChatboxProps {
  className?: string;
}

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  isLoading?: boolean;
  isStreaming?: boolean;
}

export function Chatbox({ className }: ChatboxProps) {
  const params = useParams();
  const documentId = params?.id as string | undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.isStreaming || last?.isLoading) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          isStreaming: false,
          isLoading: false,
          content: last.content || "(Generation cancelled)",
        };
        return updated;
      }
      return prev;
    });
  }, []);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isGenerating) return;

    // Add user message
    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    // Add loading placeholder
    const loadingMsg: ChatMessage = {
      role: "bot",
      content: "",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    const docIds = documentId ? [documentId] : null;

    const controller = streamRAGGeneration(
      query,
      docIds,
      // onToken — append each token to the bot message
      (token: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          const lastMsg = updated[lastIdx];
          if (lastMsg?.role === "bot") {
            updated[lastIdx] = {
              ...lastMsg,
              content: lastMsg.content + token,
              isLoading: false,
              isStreaming: true,
            };
          }
          return updated;
        });
      },
      // onDone — mark streaming as complete
      () => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "bot") {
            updated[lastIdx] = {
              ...updated[lastIdx],
              isStreaming: false,
              isLoading: false,
            };
          }
          return updated;
        });
      },
      // onError — show error in chat
      (error: string) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        toast.error(error);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "bot") {
            updated[lastIdx] = {
              role: "bot",
              content: `Error: ${error}`,
              isStreaming: false,
              isLoading: false,
            };
          }
          return updated;
        });
      },
    );

    abortControllerRef.current = controller;
  };

  return (
    <Card
      className={`flex flex-col h-155 shadow-lg border-slate-900 bg-slate-950/40 backdrop-blur-md text-foreground rounded-2xl overflow-hidden ${className || ""}`}
    >
      <CardHeader className="bg-slate-950/80 border-b border-slate-900/60 py-4 px-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md font-semibold flex items-center gap-2 text-violet-400">
            <Sparkles className="h-4.5 w-4.5 animate-pulse text-violet-400" />
            Semantic Copilot
          </CardTitle>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            {isGenerating ? (
              <span className="text-violet-400 animate-pulse">GENERATING</span>
            ) : (
              "RAG ACTIVE"
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-900"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-900 text-violet-400/80 shadow-inner">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-slate-200">
                Ask your knowledge base
              </h3>
              <p className="text-xs text-slate-500 max-w-60">
                Ask questions about your uploaded documents. The AI will retrieve
                relevant context and generate a grounded answer.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              } space-y-1`}
            >
              <span className="text-[10px] text-slate-500 px-1 font-mono uppercase tracking-wide">
                {msg.role === "user" ? "You" : "Copilot"}
              </span>

              {msg.isLoading ? (
                <div className="flex items-center space-x-2 text-violet-400 bg-slate-950/60 border border-slate-900 px-4 py-3 rounded-2xl">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="text-xs font-medium tracking-wide">
                    Retrieving context and generating answer...
                  </span>
                </div>
              ) : (
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white border-violet-500"
                      : "bg-slate-900/40 text-slate-200 border-slate-900"
                  }`}
                >
                  <div className="whitespace-pre-wrap wrap-break-word">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="bg-slate-950/80 border-t border-slate-900/60 py-4 px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            type="text"
            placeholder={
              isGenerating ? "Generating..." : "Ask the document copilot..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            className="flex-1 bg-slate-950 border-slate-900 hover:border-slate-800 text-sm text-foreground placeholder:text-slate-500 rounded-xl focus-visible:ring-violet-600 focus-visible:border-violet-600"
          />
          {isGenerating ? (
            <Button
              type="button"
              size="icon"
              onClick={handleCancel}
              className="bg-red-600/80 hover:bg-red-500 text-white rounded-xl shadow-md cursor-pointer shrink-0"
            >
              <Square className="h-3.5 w-3.5" />
              <span className="sr-only">Stop generation</span>
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-md cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </form>
      </CardFooter>
    </Card>
  );
}
