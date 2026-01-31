// BroadcastChannel wrapper for remote control communication
// Falls back to localStorage polling for browsers without BroadcastChannel support

export interface RemoteState {
  isScrolling: boolean;
  speed: number;
  progress: number; // 0-100
  currentLine: number;
  totalLines: number;
  cuePoints: number[];
  scrollMode: 'continuous' | 'paging' | 'voice' | 'rsvp';
  currentPage?: number;
  totalPages?: number;
  rsvpSpeed?: number;
  rsvpWordIndex?: number;
  rsvpTotalWords?: number;
}

export type RemoteCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'speed-up' }
  | { type: 'speed-down' }
  | { type: 'reset' }
  | { type: 'jump-cue'; cueIndex: number }
  | { type: 'advance-page'; direction: 1 | -1 };

export interface RemoteMessage {
  type: 'state' | 'command' | 'ping' | 'pong';
  payload?: RemoteState | RemoteCommand;
  timestamp: number;
}

const CHANNEL_NAME = 'tpt-remote';
const STORAGE_STATE_KEY = 'tpt/remote-state';
const STORAGE_COMMAND_KEY = 'tpt/remote-commands';
const POLL_INTERVAL = 100; // ms for localStorage fallback
const STATE_BROADCAST_INTERVAL = 200; // ms

// Helper to compare state for dirty checking
function stateEquals(a: RemoteState | null, b: RemoteState): boolean {
  if (!a) return false;
  return (
    a.isScrolling === b.isScrolling &&
    a.speed === b.speed &&
    Math.abs(a.progress - b.progress) < 0.5 && // Allow small progress drift
    a.currentLine === b.currentLine &&
    a.totalLines === b.totalLines &&
    a.scrollMode === b.scrollMode &&
    a.currentPage === b.currentPage &&
    a.rsvpSpeed === b.rsvpSpeed &&
    a.rsvpWordIndex === b.rsvpWordIndex &&
    a.cuePoints.length === b.cuePoints.length &&
    a.cuePoints.every((v, i) => v === b.cuePoints[i])
  );
}

export class RemoteChannel {
  private channel: BroadcastChannel | null = null;
  private useLocalStorage: boolean = false;
  private pollIntervalId: number | null = null;
  private stateIntervalId: number | null = null;
  private onStateCallback: ((state: RemoteState) => void) | null = null;
  private onCommandCallback: ((command: RemoteCommand) => void) | null = null;
  private lastCommandTimestamp: number = 0;
  private lastBroadcastState: RemoteState | null = null;
  private isMain: boolean; // true for main window, false for remote

  constructor(isMain: boolean = true) {
    this.isMain = isMain;

    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    } else {
      // Fall back to localStorage polling
      this.useLocalStorage = true;
      this.startPolling();
    }
  }

  private handleMessage(message: RemoteMessage) {
    // Ignore stale messages (older than 1 second)
    if (Date.now() - message.timestamp > 1000) return;

    if (message.type === 'state' && !this.isMain && this.onStateCallback) {
      this.onStateCallback(message.payload as RemoteState);
    } else if (message.type === 'command' && this.isMain && this.onCommandCallback) {
      this.onCommandCallback(message.payload as RemoteCommand);
    } else if (message.type === 'ping' && this.isMain) {
      this.send({ type: 'pong', timestamp: Date.now() });
    }
  }

  private send(message: RemoteMessage) {
    if (this.channel) {
      this.channel.postMessage(message);
    } else if (this.useLocalStorage) {
      const key = message.type === 'state' ? STORAGE_STATE_KEY : STORAGE_COMMAND_KEY;
      try {
        localStorage.setItem(key, JSON.stringify(message));
      } catch (e) {
        console.warn('Could not write to localStorage:', e);
      }
    }
  }

  // For main window: broadcast state to remotes
  broadcastState(state: RemoteState) {
    if (!this.isMain) return;
    this.send({ type: 'state', payload: state, timestamp: Date.now() });
  }

  // For main window: start periodic state broadcasting (only when state changes)
  startStateBroadcasting(getState: () => RemoteState) {
    if (!this.isMain) return;

    // Broadcast immediately
    const initialState = getState();
    this.lastBroadcastState = initialState;
    this.broadcastState(initialState);

    // Then check periodically and only broadcast if state changed
    this.stateIntervalId = window.setInterval(() => {
      const currentState = getState();
      if (!stateEquals(this.lastBroadcastState, currentState)) {
        this.lastBroadcastState = currentState;
        this.broadcastState(currentState);
      }
    }, STATE_BROADCAST_INTERVAL);
  }

  stopStateBroadcasting() {
    if (this.stateIntervalId !== null) {
      clearInterval(this.stateIntervalId);
      this.stateIntervalId = null;
    }
  }

  // For remote: send command to main
  sendCommand(command: RemoteCommand) {
    if (this.isMain) return;
    this.send({ type: 'command', payload: command, timestamp: Date.now() });
  }

  // For remote: request current state
  requestState() {
    if (this.isMain) return;
    this.send({ type: 'ping', timestamp: Date.now() });
  }

  // Register callback for state updates (used by remote)
  onState(callback: (state: RemoteState) => void) {
    this.onStateCallback = callback;
  }

  // Register callback for commands (used by main)
  onCommand(callback: (command: RemoteCommand) => void) {
    this.onCommandCallback = callback;
  }

  // LocalStorage fallback polling
  private startPolling() {
    if (!this.useLocalStorage) return;

    this.pollIntervalId = window.setInterval(() => {
      try {
        const key = this.isMain ? STORAGE_COMMAND_KEY : STORAGE_STATE_KEY;
        const data = localStorage.getItem(key);
        if (data) {
          const message = JSON.parse(data) as RemoteMessage;
          // Check if this is a new message
          if (message.timestamp > this.lastCommandTimestamp) {
            this.lastCommandTimestamp = message.timestamp;
            this.handleMessage(message);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }, POLL_INTERVAL);
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.stopStateBroadcasting();
    this.onStateCallback = null;
    this.onCommandCallback = null;

    // Clean up localStorage keys
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(STORAGE_STATE_KEY);
        localStorage.removeItem(STORAGE_COMMAND_KEY);
      } catch (e) {
        // Ignore
      }
    }
  }
}
