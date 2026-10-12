import { LogOut, MessageSquare, SquarePen, Trash2, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../Logo.jsx';

const DAY = 24 * 60 * 60 * 1000;

// Buckets conversations (already sorted newest first) into Today / Yesterday / …
function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = [
    { label: 'Today', since: today },
    { label: 'Yesterday', since: today - DAY },
    { label: 'Previous 7 days', since: today - 7 * DAY },
    { label: 'Previous 30 days', since: today - 30 * DAY },
    { label: 'Older', since: -Infinity },
  ].map((group) => ({ ...group, items: [] }));

  for (const conversation of conversations) {
    const time = new Date(conversation.updatedAt).getTime();
    groups.find((group) => time >= group.since).items.push(conversation);
  }
  return groups.filter((group) => group.items.length > 0);
}

export default function Sidebar({ conversations, isLoading, isOpen, onClose, onNewChat, onDelete }) {
  const { user, logout } = useAuth();

  function confirmDelete(conversation) {
    if (window.confirm(`Delete "${conversation.title}"? This can't be undone.`)) {
      onDelete(conversation._id);
    }
  }

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 md:static md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Conversation history"
      >
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex items-center gap-2 px-1 font-semibold">
            <Logo size={26} />
            <span>Gemini Chat</span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn md:hidden" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <SquarePen size={16} />
            New chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <div className="space-y-2 px-1 pt-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center px-4 pt-10 text-center text-sm text-zinc-500">
              <MessageSquare size={20} className="mb-2" />
              Your conversations will appear here.
            </div>
          ) : (
            groupByDate(conversations).map((group) => (
              <section key={group.label} className="mt-3">
                <h3 className="px-3 pb-1 text-xs font-medium text-zinc-500">{group.label}</h3>
                <ul className="space-y-0.5">
                  {group.items.map((conversation) => (
                    <li key={conversation._id} className="group relative">
                      <NavLink
                        to={`/chat/${conversation._id}`}
                        onClick={onClose}
                        title={conversation.title}
                        className={({ isActive }) =>
                          `block truncate rounded-lg py-2 pr-9 pl-3 text-sm transition ${
                            isActive
                              ? 'bg-zinc-200 font-medium dark:bg-zinc-800'
                              : 'text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                          }`
                        }
                      >
                        {conversation.title}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => confirmDelete(conversation)}
                        className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:text-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 dark:hover:text-red-400"
                        aria-label={`Delete "${conversation.title}"`}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </nav>

        <div className="flex items-center gap-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button type="button" onClick={logout} className="icon-btn" aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
