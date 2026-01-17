# Web Dashboard Quick Start

## 🎯 What is it?

A beautiful real-time web interface to visualize SpindleFlow workflow execution with:
- **Live timeline** of all events
- **Active agents panel** with progress bars
- **Statistics dashboard** (workflows, agents, memory queries)
- **Real-time WebSocket updates**

## 🚀 How to Use

### Step 1: Start a workflow with dashboard flag

```bash
npm run dev -- run configs/demo-sequential.yml -i "Create a todo app" --dashboard
```

### Step 2: Open the dashboard

The server will automatically start and print:
```
📊 Dashboard Server Started
   URL: http://localhost:3001
   Open this URL in your browser to view execution logs
```

### Step 3: Watch your workflow execute in real-time!

Open **http://localhost:3001** in your browser and see:

## 📊 Dashboard Features

### Header
- **Status Indicator**: Green = Connected, Red = Disconnected
- **Clear History Button**: Reset all logs

### Statistics Cards
1. **Total Workflows**: Number of workflows executed
2. **Agents Executed**: Total agent count
3. **Memory Queries**: Number of persistent memory lookups
4. **Active Workflows**: Currently running workflows

### Execution Timeline (Left Panel)
Shows chronological events with:
- 🔵 **Workflow events** (start/end)
- 🟢 **Agent events** (start/complete)
- 🟡 **Memory operations** (query/store)
- 🔴 **Errors**
- ⚪ **System logs**

Each event displays:
- Timestamp
- Event title
- Detailed information
- Color-coded markers

### Active Agents Panel (Right Panel)
Shows currently executing agents with:
- Agent name and role
- Current status (Processing, Querying, Storing, etc.)
- Progress bar (0-100%)
- ✓ checkmark when completed

## 🎨 Visual Elements

### Timeline Events
```
10:30:45 AM
Workflow Started: sequential
Steps: 3

10:30:46 AM
Agent Started: System Architect
ID: architect | Step 1/3

10:30:48 AM
Memory Query: architect
Found 3 memories (relevance: 87.5%)

10:30:52 AM
Agent Completed: architect
Duration: 4.2s | Output: 1.52KB
```

### Agent Cards
```
┌─────────────────────────────┐
│ ⚙️ System Architect         │
│ Status: Calling LLM         │
│ [████████████░░░░░░] 60%    │
└─────────────────────────────┘
```

## 🔄 Real-Time Updates

The dashboard uses **WebSockets** for instant updates:
- No page refresh needed
- Events appear as they happen
- Automatic reconnection if connection drops
- Smooth animations for new events

## 🎯 Example Usage

### Basic Sequential Workflow
```bash
npm run dev -- run configs/demo-sequential.yml \
  -i "Build a user authentication system" \
  --dashboard
```

### Parallel Workflow with Sub-Agents
```bash
npm run dev -- run configs/demo-sub-agents.yml \
  -i "Create a full-stack application" \
  --dashboard
```

### With Persistent Memory
```bash
npm run dev -- run configs/demo-sequential.yml \
  -i "Design a microservices architecture" \
  --dashboard
```

## 📱 Responsive Design

The dashboard works on:
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Tablets
- ✅ Mobile devices

## 🛠️ Customization

### Change Port
Edit `src/server/dashboard-server.ts`:
```typescript
constructor(port: number = 3001) { // Change this
```

### Styling
Edit `public/dashboard.html` in the `<style>` section

### Events
Add custom events in orchestrators:
```typescript
dashboard.sendEvent({
  type: 'custom',
  timestamp: Date.now(),
  data: { your: 'data' }
});
```

## 🐛 Troubleshooting

### Dashboard won't start
- Check port 3001 is not in use
- Run `npm install` to ensure dependencies are installed

### No events showing
- Make sure you used `--dashboard` flag
- Check browser console for WebSocket errors
- Verify the workflow is actually running

### Connection keeps dropping
- Check firewall settings
- Ensure stable network connection
- Try refreshing the browser

## 🎉 Enjoy!

Now you have a beautiful real-time dashboard to monitor your SpindleFlow workflows!
