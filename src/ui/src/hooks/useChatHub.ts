import * as signalR from '@microsoft/signalr'
import { useEffect, useRef, useState } from 'react'

export interface ChatMessage {
  id: number
  channelId?: number
  userId: number
  username: string
  text: string
  sentAt: string
}

export function useChatHub(channelId: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/chat', {
        accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    connection.on('History', (history: ChatMessage[]) => {
      setMessages(history)
    })

    connection.on('NewMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg])
    })

    connection.start()
      .then(() => {
        setConnected(true)
        connection.invoke('JoinChannel', channelId)
      })
      .catch(() => {})

    connectionRef.current = connection

    return () => {
      connection.invoke('LeaveChannel', channelId).catch(() => {}).finally(() => {
        connection.stop()
        setConnected(false)
      })
    }
  }, [channelId])

  const sendMessage = (text: string) => {
    connectionRef.current?.invoke('SendMessage', channelId, text).catch(() => {})
  }

  return { messages, connected, sendMessage }
}
