import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'http'

export type WSMessageType = 'sensor_update' | 'alert' | 'status_change' | 'welcome'

export interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: string
}

class WebSocketService {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()

  init(server: HttpServer): void {
    if (this.wss) return

    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`)

      this.sendToClient(ws, {
        type: 'welcome',
        payload: { message: 'Connected to Tower Crane Monitor', clientCount: this.clients.size },
        timestamp: new Date().toISOString(),
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        console.log(`[WS] Client disconnected. Total clients: ${this.clients.size}`)
      })

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err)
        this.clients.delete(ws)
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          console.log('[WS] Received:', msg.type)
        } catch (e) {
          console.error('[WS] Message parse error:', e)
        }
      })
    })

    console.log('[WS] WebSocket server initialized on /ws')
  }

  broadcast(type: WSMessageType, payload: any): void {
    const message: WSMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    }
    this.sendToAll(message)
  }

  private sendToAll(message: WSMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  getClientCount(): number {
    return this.clients.size
  }
}

export const wsService = new WebSocketService()
