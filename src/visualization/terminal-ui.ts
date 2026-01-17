/**
 * Enhanced Terminal UI for Workflow Execution
 * Provides real-time visual feedback with progress bars, status indicators, and execution timeline
 */

interface WorkflowExecutionUI {
  startWorkflow(type: string, totalSteps: number): void;
  startAgent(agentId: string, role: string, stepNumber: number, totalSteps: number): void;
  updateAgentProgress(agentId: string, status: string, details?: string): void;
  completeAgent(agentId: string, duration: number, outputLength: number): void;
  showMemoryQuery(agentId: string, memoriesFound: number, topScore?: number): void;
  showMemoryStore(agentId: string, success: boolean): void;
  completeWorkflow(totalDuration: number, agentCount: number): void;
  showError(agentId: string, error: string): void;
  showSummary(summaryData: any): void;
}

class TerminalUI implements WorkflowExecutionUI {
  private startTime: number = 0;
  private agentStartTimes: Map<string, number> = new Map();
  private completedAgents: string[] = [];
  
  // Colors
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    
    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
  };

  private box = {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    leftT: '╠',
    rightT: '╣',
    topT: '╦',
    bottomT: '╩',
    cross: '╬',
  };

  private spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;

  startWorkflow(type: string, totalSteps: number): void {
    this.startTime = Date.now();
    this.completedAgents = [];
    
    console.log('\n');
    this.printBox([
      `${this.colors.bright}${this.colors.cyan}🚀 WORKFLOW EXECUTION STARTED${this.colors.reset}`,
      '',
      `Type: ${this.colors.yellow}${type.toUpperCase()}${this.colors.reset}`,
      `Steps: ${this.colors.yellow}${totalSteps}${this.colors.reset}`,
      `Time: ${this.colors.gray}${new Date().toLocaleTimeString()}${this.colors.reset}`,
    ], 'cyan');
    console.log('\n');
  }

  startAgent(agentId: string, role: string, stepNumber: number, totalSteps: number): void {
    this.agentStartTimes.set(agentId, Date.now());
    
    const progress = this.createProgressBar(stepNumber, totalSteps, 30);
    
    console.log(this.colors.bright + this.colors.blue + '┌─────────────────────────────────────────────────────────────────────┐' + this.colors.reset);
    console.log(this.colors.bright + this.colors.blue + '│' + this.colors.reset + 
                ` ${this.colors.bright}Step ${stepNumber}/${totalSteps}${this.colors.reset} ${progress}` +
                ' '.repeat(Math.max(0, 67 - (`Step ${stepNumber}/${totalSteps} ${progress}`.length))) +
                this.colors.bright + this.colors.blue + '│' + this.colors.reset);
    console.log(this.colors.bright + this.colors.blue + '│' + this.colors.reset + 
                ` ${this.colors.bright}${this.colors.cyan}▶ ${role}${this.colors.reset}` +
                ' '.repeat(Math.max(0, 67 - (` ▶ ${role}`.length))) +
                this.colors.bright + this.colors.blue + '│' + this.colors.reset);
    console.log(this.colors.bright + this.colors.blue + '│' + this.colors.reset + 
                ` ${this.colors.gray}ID: ${agentId}${this.colors.reset}` +
                ' '.repeat(Math.max(0, 67 - (` ID: ${agentId}`.length))) +
                this.colors.bright + this.colors.blue + '│' + this.colors.reset);
    console.log(this.colors.bright + this.colors.blue + '└─────────────────────────────────────────────────────────────────────┘' + this.colors.reset);
  }

  updateAgentProgress(agentId: string, status: string, details?: string): void {
    const emoji = this.getStatusEmoji(status);
    const color = this.getStatusColor(status);
    
    console.log(`  ${emoji} ${color}${status}${this.colors.reset}${details ? ': ' + this.colors.gray + details + this.colors.reset : ''}`);
  }

  showMemoryQuery(agentId: string, memoriesFound: number, topScore?: number): void {
    if (memoriesFound > 0) {
      const scoreStr = topScore ? ` (relevance: ${this.colors.yellow}${(topScore * 100).toFixed(1)}%${this.colors.reset})` : '';
      console.log(`  ${this.colors.magenta}🧠 Persistent Memory${this.colors.reset}: Found ${this.colors.green}${memoriesFound}${this.colors.reset} relevant memories${scoreStr}`);
    } else {
      console.log(`  ${this.colors.gray}🧠 Persistent Memory: No relevant memories found${this.colors.reset}`);
    }
  }

  showMemoryStore(agentId: string, success: boolean): void {
    if (success) {
      console.log(`  ${this.colors.green}💾 Stored to persistent memory${this.colors.reset}`);
    } else {
      console.log(`  ${this.colors.yellow}⚠️  Failed to store to persistent memory${this.colors.reset}`);
    }
  }

  completeAgent(agentId: string, duration: number, outputLength: number): void {
    this.completedAgents.push(agentId);
    
    const elapsed = this.formatDuration(duration);
    const size = this.formatBytes(outputLength);
    
    console.log(`  ${this.colors.green}✓${this.colors.reset} ${this.colors.bright}Completed${this.colors.reset} in ${this.colors.cyan}${elapsed}${this.colors.reset} | Output: ${this.colors.yellow}${size}${this.colors.reset}`);
    console.log('');
  }

  completeWorkflow(totalDuration: number, agentCount: number): void {
    const elapsed = this.formatDuration(totalDuration);
    
    console.log('\n');
    this.printBox([
      `${this.colors.bright}${this.colors.green}✓ WORKFLOW COMPLETED${this.colors.reset}`,
      '',
      `Agents Executed: ${this.colors.green}${agentCount}${this.colors.reset}`,
      `Total Duration: ${this.colors.cyan}${elapsed}${this.colors.reset}`,
      `Average: ${this.colors.yellow}${this.formatDuration(totalDuration / agentCount)}${this.colors.reset} per agent`,
    ], 'green');
    console.log('\n');
  }

  showError(agentId: string, error: string): void {
    console.log('\n');
    this.printBox([
      `${this.colors.bright}${this.colors.red}✗ ERROR${this.colors.reset}`,
      '',
      `Agent: ${this.colors.yellow}${agentId}${this.colors.reset}`,
      `Error: ${this.colors.red}${error}${this.colors.reset}`,
    ], 'red');
    console.log('\n');
  }

  showSummary(summaryData: any): void {
    const { timeline, memories, finalOutput } = summaryData;
    
    console.log(this.colors.bright + this.colors.cyan + '═══════════════════════════════════════════════════════════════════════' + this.colors.reset);
    console.log(this.colors.bright + '                           EXECUTION SUMMARY' + this.colors.reset);
    console.log(this.colors.bright + this.colors.cyan + '═══════════════════════════════════════════════════════════════════════' + this.colors.reset);
    console.log('');
    
    // Timeline
    if (timeline && timeline.length > 0) {
      console.log(this.colors.bright + '⏱  Timeline:' + this.colors.reset);
      timeline.forEach((entry: any, index: number) => {
        const duration = this.formatDuration(entry.duration || 0);
        const bar = this.createDurationBar(entry.duration || 0, Math.max(...timeline.map((e: any) => e.duration || 0)), 20);
        console.log(`  ${index + 1}. ${this.colors.cyan}${entry.role}${this.colors.reset} ${bar} ${this.colors.yellow}${duration}${this.colors.reset}`);
      });
      console.log('');
    }
    
    // Memories
    if (memories) {
      console.log(this.colors.bright + '🧠 Persistent Memory:' + this.colors.reset);
      console.log(`  Queries: ${this.colors.green}${memories.queries || 0}${this.colors.reset}`);
      console.log(`  Stored: ${this.colors.green}${memories.stored || 0}${this.colors.reset}`);
      console.log(`  Retrieved: ${this.colors.green}${memories.retrieved || 0}${this.colors.reset}`);
      console.log('');
    }
    
    // Final output info
    if (finalOutput) {
      console.log(this.colors.bright + '📄 Final Output:' + this.colors.reset);
      console.log(`  Length: ${this.colors.yellow}${this.formatBytes(finalOutput.length)}${this.colors.reset}`);
      console.log(`  File: ${this.colors.cyan}output/FINAL_OUTPUT.txt${this.colors.reset}`);
      console.log('');
    }
    
    console.log(this.colors.bright + this.colors.cyan + '═══════════════════════════════════════════════════════════════════════' + this.colors.reset);
    console.log('');
  }

  // Helper methods
  private printBox(lines: string[], color: 'cyan' | 'green' | 'yellow' | 'red' = 'cyan'): void {
    const maxLength = Math.max(...lines.map(l => this.stripAnsi(l).length), 50);
    const colorCode = this.colors[color];
    const bright = this.colors.bright;
    const reset = this.colors.reset;
    
    console.log(bright + colorCode + this.box.topLeft + this.box.horizontal.repeat(maxLength + 2) + this.box.topRight + reset);
    
    lines.forEach(line => {
      const stripped = this.stripAnsi(line);
      const padding = ' '.repeat(maxLength - stripped.length);
      console.log(bright + colorCode + this.box.vertical + reset + ' ' + line + padding + ' ' + bright + colorCode + this.box.vertical + reset);
    });
    
    console.log(bright + colorCode + this.box.bottomLeft + this.box.horizontal.repeat(maxLength + 2) + this.box.bottomRight + reset);
  }

  private createProgressBar(current: number, total: number, width: number = 30): string {
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;
    
    const bar = this.colors.green + '█'.repeat(filled) + this.colors.gray + '░'.repeat(empty) + this.colors.reset;
    return `[${bar}] ${Math.round(percentage * 100)}%`;
  }

  private createDurationBar(duration: number, maxDuration: number, width: number = 20): string {
    const percentage = duration / maxDuration;
    const filled = Math.round(width * percentage);
    const empty = width - filled;
    
    return this.colors.cyan + '▓'.repeat(filled) + this.colors.gray + '░'.repeat(empty) + this.colors.reset;
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'PROCESSING': '⚙️ ',
      'QUERYING': '🔍',
      'STORING': '💾',
      'TOOL_CALL': '🔧',
      'LLM_CALL': '🤖',
      'COMPLETE': '✓',
      'ERROR': '✗',
      'PLANNING': '📋',
      'SYNTHESIZING': '🔄',
    };
    
    return emojiMap[status] || '•';
  }

  private getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'PROCESSING': this.colors.yellow,
      'QUERYING': this.colors.magenta,
      'STORING': this.colors.blue,
      'TOOL_CALL': this.colors.cyan,
      'LLM_CALL': this.colors.blue,
      'COMPLETE': this.colors.green,
      'ERROR': this.colors.red,
      'PLANNING': this.colors.cyan,
      'SYNTHESIZING': this.colors.magenta,
    };
    
    return colorMap[status] || this.colors.white;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }

  private stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

// Singleton instance
export const terminalUI = new TerminalUI();
