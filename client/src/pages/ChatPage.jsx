import { Menu, SquarePen } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorBanner from '../components/chat/ErrorBanner.jsx';
import MessageList from '../components/chat/MessageList.jsx';
import PromptInput from '../components/chat/PromptInput.jsx';
import Sidebar from '../components/chat/Sidebar.jsx';
import { useChat } from '../hooks/useChat.js';

export default function ChatPage() {
  const { conversationId } = useParams();
  const chat = useChat(conversationId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = chat.conversations.find((c) => c._id === conversationId)?.title ?? 'New chat';

  function startNewChat() {
    chat.startNewChat();
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={chat.conversations}
        isLoading={chat.isLoadingList}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={startNewChat}
        onDelete={chat.deleteConversation}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
          <button type="button" onClick={() => setSidebarOpen(true)} className="icon-btn md:hidden" aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium md:px-2">{title}</h1>
          <button type="button" onClick={startNewChat} className="icon-btn md:hidden" aria-label="New chat">
            <SquarePen size={18} />
          </button>
        </header>

        {chat.error && <ErrorBanner message={chat.error} onDismiss={chat.clearError} />}

        <MessageList messages={chat.messages} isLoading={chat.isLoadingMessages} onSuggestion={chat.sendMessage} />

        <PromptInput
          onSend={chat.sendMessage}
          onStop={chat.stop}
          isStreaming={chat.isStreaming}
          disabled={chat.isLoadingMessages}
        />
      </main>
    </div>
  );
}
