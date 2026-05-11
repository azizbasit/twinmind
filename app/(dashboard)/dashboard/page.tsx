import { ChatInterface } from "@/components/chat-interface";

export default function DashboardPage() {
  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      <ChatInterface />
    </div>
  );
}
