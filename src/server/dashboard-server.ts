import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

export interface ExecutionEvent {
  type: 'workflow_start' | 'workflow_end' | 'agent_start' | 'agent_complete' | 'agent_progress' | 'memory_query' | 'memory_store' | 'error' | 'log';
  timestamp: number;
  data: any;
}

class DashboardServer {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private executionHistory: ExecutionEvent[] = [];
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(process.cwd(), 'public')));
  }

  private setupRoutes() {
    // Serve the dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
    });

    // API endpoint to get execution history
    this.app.get('/api/history', (req, res) => {
      res.json(this.executionHistory);
    });

    // API endpoint to clear history
    this.app.post('/api/clear', (req, res) => {
      this.executionHistory = [];
      this.broadcast({ type: 'log', timestamp: Date.now(), data: { message: 'History cleared' } });
      res.json({ success: true });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New dashboard client connected');
      this.clients.add(ws);

      // Send execution history to new client
      ws.send(JSON.stringify({ type: 'history', data: this.executionHistory }));

      ws.on('close', () => {
        console.log('🔌 Dashboard client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private broadcast(event: ExecutionEvent) {
    const message = JSON.stringify(event);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public sendEvent(event: ExecutionEvent) {
    this.executionHistory.push(event);
    
    // Keep only last 1000 events
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }

    this.broadcast(event);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`\n📊 Dashboard Server Started`);
        console.log(`   URL: http://localhost:${this.port}`);
        console.log(`   Open this URL in your browser to view execution logs\n`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.server.close(() => {
        console.log('Dashboard server stopped');
        resolve();
      });
    });
  }
}

// Singleton instance
let dashboardServerInstance: DashboardServer | null = null;

export function getDashboardServer(): DashboardServer {
  if (!dashboardServerInstance) {
    dashboardServerInstance = new DashboardServer();
  }
  return dashboardServerInstance;
}

export async function startDashboardServer(): Promise<DashboardServer> {
  const server = getDashboardServer();
  await server.start();
  return server;
}
