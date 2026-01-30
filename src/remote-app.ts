// Remote Control Application
// Opens in a separate tab to control the main teleprompter

import "./style.css";
import { RemoteChannel, type RemoteState, type RemoteCommand } from "./remote-channel";
import { i18n } from "./i18n";

class RemoteApp {
  private container: HTMLElement;
  private channel: RemoteChannel;
  private statusElement: HTMLElement | null = null;
  private playPauseBtn: HTMLButtonElement | null = null;
  private progressBar: HTMLElement | null = null;
  private speedDisplay: HTMLElement | null = null;
  private cueListElement: HTMLElement | null = null;
  private pollIntervalId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.channel = new RemoteChannel(false); // false = remote (not main)

    this.render();
    this.setupListeners();
    this.channel.requestState();
  }

  private render() {
    this.container.innerHTML = '';
    this.container.className = 'remote-container';

    // Title
    const title = document.createElement('h1');
    title.className = 'remote-title';
    title.textContent = i18n.t('remoteControl');
    this.container.appendChild(title);

    // Status indicator
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'remote-status';
    this.statusElement.textContent = i18n.t('remoteDisconnected');
    this.container.appendChild(this.statusElement);

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'remote-progress';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'remote-progress-bar';
    this.progressBar.style.width = '0%';
    progressContainer.appendChild(this.progressBar);
    this.container.appendChild(progressContainer);

    // Controls container
    const controls = document.createElement('div');
    controls.className = 'remote-controls';

    // Play/Pause button
    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.className = 'remote-btn remote-btn-primary';
    this.playPauseBtn.textContent = i18n.t('play');
    this.playPauseBtn.addEventListener('click', () => this.sendCommand({ type: 'toggle' }));
    controls.appendChild(this.playPauseBtn);

    // Speed controls
    const speedRow = document.createElement('div');
    speedRow.style.display = 'flex';
    speedRow.style.gap = '12px';

    const speedDownBtn = document.createElement('button');
    speedDownBtn.className = 'remote-btn remote-btn-secondary';
    speedDownBtn.style.flex = '1';
    speedDownBtn.textContent = '−';
    speedDownBtn.addEventListener('click', () => this.sendCommand({ type: 'speed-down' }));

    this.speedDisplay = document.createElement('div');
    this.speedDisplay.className = 'remote-btn remote-btn-secondary';
    this.speedDisplay.style.flex = '2';
    this.speedDisplay.style.pointerEvents = 'none';
    this.speedDisplay.textContent = '1.5x';

    const speedUpBtn = document.createElement('button');
    speedUpBtn.className = 'remote-btn remote-btn-secondary';
    speedUpBtn.style.flex = '1';
    speedUpBtn.textContent = '+';
    speedUpBtn.addEventListener('click', () => this.sendCommand({ type: 'speed-up' }));

    speedRow.appendChild(speedDownBtn);
    speedRow.appendChild(this.speedDisplay);
    speedRow.appendChild(speedUpBtn);
    controls.appendChild(speedRow);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'remote-btn remote-btn-secondary';
    resetBtn.textContent = i18n.t('backToTop');
    resetBtn.addEventListener('click', () => this.sendCommand({ type: 'reset' }));
    controls.appendChild(resetBtn);

    this.container.appendChild(controls);

    // Cue points list
    const cueHeader = document.createElement('h2');
    cueHeader.style.fontSize = 'var(--font-sm)';
    cueHeader.style.color = 'var(--apple-text-secondary)';
    cueHeader.style.marginTop = '24px';
    cueHeader.textContent = 'Cue Points';
    this.container.appendChild(cueHeader);

    this.cueListElement = document.createElement('div');
    this.cueListElement.className = 'remote-cue-list';
    this.cueListElement.innerHTML = `<div class="remote-cue-item" style="color: var(--apple-text-tertiary)">${i18n.t('noCuePoints')}</div>`;
    this.container.appendChild(this.cueListElement);
  }

  private setupListeners() {
    // Listen for state updates from main window
    this.channel.onState((state) => {
      this.updateUI(state);

      // Update status to connected
      if (this.statusElement) {
        this.statusElement.textContent = i18n.t('remoteConnected');
        this.statusElement.classList.add('connected');
      }
    });

    // Request state periodically in case connection was lost
    this.pollIntervalId = window.setInterval(() => {
      this.channel.requestState();
    }, 1000);
  }

  private updateUI(state: RemoteState) {
    // Update play/pause button
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = state.isScrolling ? i18n.t('pause') : i18n.t('play');
      this.playPauseBtn.classList.toggle('playing', state.isScrolling);
    }

    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${state.progress}%`;
    }

    // Update speed display
    if (this.speedDisplay) {
      this.speedDisplay.textContent = `${state.speed}x`;
    }

    // Update cue points list
    if (this.cueListElement) {
      if (state.cuePoints.length === 0) {
        this.cueListElement.innerHTML = `<div class="remote-cue-item" style="color: var(--apple-text-tertiary)">${i18n.t('noCuePoints')}</div>`;
      } else {
        this.cueListElement.innerHTML = '';
        state.cuePoints.forEach((lineIndex, cueIndex) => {
          const item = document.createElement('div');
          item.className = 'remote-cue-item';
          item.textContent = `Cue ${cueIndex + 1} (Line ${lineIndex + 1})`;
          item.addEventListener('click', () => {
            this.sendCommand({ type: 'jump-cue', cueIndex });
          });
          this.cueListElement!.appendChild(item);
        });
      }
    }
  }

  private sendCommand(command: RemoteCommand) {
    this.channel.sendCommand(command);
  }

  destroy() {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.channel.destroy();
  }
}

// Initialize remote app
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('remote-app');
  if (container) {
    new RemoteApp(container);
  }
});
