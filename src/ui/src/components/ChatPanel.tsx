import { useEffect, useRef, useState } from 'react'
import { useChatHub } from '../hooks/useChatHub'
import { useAuth } from '../hooks/useAuth'

export function ChatPanel({ channelId }: { channelId: number }) {
  const { messages, connected, sendMessage } = useChatHub(channelId)
  const { user } = useAuth()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    const text = draft.trim()
    if (!text || !connected) return
    sendMessage(text)
    setDraft('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center pt-4">
            {connected ? 'No messages yet. Say something!' : 'Connecting…'}
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id}>
            <span className={`font-semibold ${msg.userId === user?.id ? 'text-violet-400' : 'text-gray-400'}`}>
              {msg.username}
            </span>
            <span className="text-gray-200 ml-1.5">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-gray-800 flex gap-2 shrink-0">
        <input
          className="flex-1 bg-gray-800 rounded px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:ring-1 focus:ring-violet-600"
          placeholder={connected ? 'Say something…' : 'Connecting…'}
          value={draft}
          disabled={!connected}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={500}
        />
        <button
          onClick={submit}
          disabled={!connected || !draft.trim()}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded text-sm text-white transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
