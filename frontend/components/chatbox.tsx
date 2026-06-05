"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Send } from "lucide-react";

interface ChatboxProps {
  className?: string;
}

export function Chatbox({ className }: ChatboxProps) {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; content: string }[]
  >([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages = [
      ...messages,
      { role: "user" as const, content: input },
    ];
    setMessages(newMessages);
    setInput("");

    // Simulate bot response (you can replace this with actual API call)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "This is a placeholder response." },
      ]);
    }, 500);
  };

  return (
    <Card className={`flex flex-col h-150 shadow-sm ${className || ""}`}>
      <CardHeader className="bg-card border-b border-border mt-0 pb-4 mb-4">
        <CardTitle className="text-foreground">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
