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
} from "@/components/ui/card";
import { Send, Loader2, BookOpen, Square, FileEdit, CheckCircle2, XCircle } from "lucide-react";
import { streamRAGGeneration, streamRAGGenerationWithTools } from "@/lib/api/rag";
import { toast } from "sonner";
import { useEditorStore } from "@/hooks/use-editor-store";
import DOMPurify from "dompurify";

interface ChatboxProps {
  className?: string;
}

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  toolResult?: {
    action: string;
    newContentHtml: string;
    actionSummary: string;
    applied?: boolean;
    dismissed?: boolean;
  };
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

  const { getContentHtml, setContent } = useEditorStore();

  const handleApplyTool = useCallback((index: number) => {
    const msg = messages[index];
    if (msg?.toolResult && !msg.toolResult.applied && !msg.toolResult.dismissed) {
      const cleanHtml = DOMPurify.sanitize(msg.toolResult.newContentHtml);
      setContent(cleanHtml);
      
      setMessages((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          toolResult: { ...updated[index].toolResult!, applied: true },
        };
        return updated;
      });
      toast.success("Changes applied to document");
    }
  }, [messages, setContent]);

  const handleDismissTool = useCallback((index: number) => {
    const msg = messages[index];
    if (msg?.toolResult && !msg.toolResult.applied && !msg.toolResult.dismissed) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          toolResult: { ...updated[index].toolResult!, dismissed: true },
        };
        return updated;
      });
    }
  }, [messages]);

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
    const currentHtml = getContentHtml();

    if (currentHtml) {
      const controller = streamRAGGenerationWithTools(
        query,
        currentHtml,
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
        (toolResult) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            const lastMsg = updated[lastIdx];
            if (lastMsg?.role === "bot") {
              updated[lastIdx] = {
                ...lastMsg,
                isLoading: false,
                isStreaming: false,
                toolResult: {
                  action: toolResult.action,
                  newContentHtml: toolResult.new_content_html,
                  actionSummary: toolResult.action_summary,
                },
              };
            }
            return updated;
          });
        },
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
        }
      );
      abortControllerRef.current = controller;
    } else {
      const controller = streamRAGGeneration(
        query,
        docIds,
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
    }
  };

  return (
    <Card
      className={`flex flex-col h-153 pt-0 shadow-lg border-zinc-800 bg-zinc-900/80 backdrop-blur-md text-foreground rounded-2xl overflow-hidden ${className || ""}`}
    >
      <CardHeader className="bg-zinc-950/80 border-b border-zinc-800/60 py-4 px-5 flex flex-col gap-3">
        <div className="flex items-center w-full justify-between">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            {isGenerating ? (
              <span className="text-yellow-500 animate-pulse">GENERATING</span>
            ) : (
              <span className="text-green-500">RAG ACTIVE</span>
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-900/50"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-700 text-yellow-500/80 shadow-inner">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">
                Ask Sum, your AI document partner
              </h3>
              <p className="text-xs text-zinc-500 max-w-60">
                Ask questions about your uploaded documents. The AI will
                retrieve relevant context and generate a grounded answer.
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
              <span className="text-[10px] text-zinc-500 px-1 font-mono uppercase tracking-wide">
                {msg.role === "user" ? "You" : "Sum"}
              </span>

              {msg.isLoading ? (
                <div className="flex items-center space-x-2 text-slate-300 bg-zinc-900/60 border border-zinc-800 px-4 py-3 rounded-2xl">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="text-xs font-medium tracking-wide">
                    Retrieving context and generating answer...
                  </span>
                </div>
              ) : (
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                    msg.role === "user"
                      ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                      : "bg-zinc-900/80 text-zinc-200 border-zinc-800"
                  }`}
                >
                  {msg.content && (
                    <div className="whitespace-pre-wrap wrap-break-word">
                      {msg.content}
                      {msg.isStreaming && !msg.toolResult && (
                        <span className="inline-block w-1.5 h-4 bg-yellow-500 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                      )}
                    </div>
                  )}

                  {msg.toolResult && (
                    <div className="mt-2 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <FileEdit className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-xs text-zinc-300">Proposed Document Change</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3">{msg.toolResult.actionSummary}</p>
                      
                      {msg.toolResult.applied ? (
                        <div className="flex items-center gap-2 text-green-500 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Changes Applied
                        </div>
                      ) : msg.toolResult.dismissed ? (
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                          <XCircle className="h-4 w-4" />
                          Changes Dismissed
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApplyTool(index)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-xs h-8"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Apply Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissTool(index)}
                            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="bg-zinc-950/80 border-t border-zinc-800/60 py-4 px-5">
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
            className="flex-1 bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-sm text-foreground placeholder:text-zinc-500 rounded-xl focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
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
              className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-xl shadow-md cursor-pointer shrink-0 disabled:opacity-50"
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
