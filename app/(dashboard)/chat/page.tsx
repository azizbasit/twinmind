import { ChatInterface } from "@/components/chat-interface";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <div className="px-4 py-2 border-b flex items-center space-x-2 bg-white">
        <MessageSquare className="h-5 w-5 text-violet-600" />
        <h1 className="text-xl font-bold">Chat with TwinMind</h1>
      </div>
      <ChatInterface />
    </div>
  );
}
