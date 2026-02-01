// Talent Display Application
// Clean display-only window for the talent/speaker
// Syncs with main operator window via BroadcastChannel

import "./style.css";
import { getFontFamily } from "./fonts";
import { splitTextIntoLines, isRTL, parseHexColor } from "./utils";
import { CONFIG } from "./config";
import { i18n } from "./i18n";

const CHANNEL_NAME = 'tpt-talent';

interface TalentState {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: number;
  letterSpacing: number;
  isFlipped: boolean;
  isFlippedVertical: boolean;
  maxWordsPerLine: number;
  readingGuideEnabled: boolean;
  activeLineIndex: number;
  translateY: number;
  overlayOpacity: number;
  horizontalMargin: number;
  textDirection: 'auto' | 'ltr' | 'rtl';
}

class TalentApp {
  private container: HTMLElement;
  private channel: BroadcastChannel | null = null;
  private displayElement: HTMLDivElement | null = null;
  private textInner: HTMLDivElement | null = null;
  private readingGuide: HTMLDivElement | null = null;
  private statusElement: HTMLDivElement | null = null;
  private currentState: TalentState | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupChannel();
  }

  private render() {
    this.container.innerHTML = '';
    this.container.className = 'talent-container';

    // Status indicator
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'talent-status';
    this.statusElement.textContent = i18n.t('waitingForSync');
    this.container.appendChild(this.statusElement);

    // Main display area
    this.displayElement = document.createElement('div');
    this.displayElement.className = 'teleprompter-container';
    this.displayElement.style.height = '100vh';

    // Text container
    const textContainer = document.createElement('div');
    textContainer.id = 'teleprompt-text';
    textContainer.className = 'p-4 text-center whitespace-pre-line teleprompter-hide-scrollbar';
    textContainer.style.overflow = 'hidden';
    textContainer.style.position = 'relative';
    textContainer.style.flex = '1';

    this.textInner = document.createElement('div');
    this.textInner.className = 'teleprompt-text-inner';
    this.textInner.dataset.testid = 'teleprompter-text';
    textContainer.appendChild(this.textInner);

    this.displayElement.appendChild(textContainer);

    // Reading guide
    this.readingGuide = document.createElement('div');
    this.readingGuide.className = 'reading-guide';
    this.displayElement.appendChild(this.readingGuide);

    this.container.appendChild(this.displayElement);
  }

  private setupChannel() {
    if (typeof BroadcastChannel === 'undefined') {
      if (this.statusElement) {
        this.statusElement.textContent = i18n.t('broadcastNotSupported');
      }
      return;
    }

    this.channel = new BroadcastChannel(CHANNEL_NAME);

    this.channel.onmessage = (event) => {
      const message = event.data;
      if (message.type === 'state') {
        this.currentState = message.payload;
        this.updateDisplay();

        if (this.statusElement) {
          this.statusElement.textContent = i18n.t('synced');
          this.statusElement.classList.add('synced');
        }
      }
    };

    // Notify operator that talent display is ready
    this.channel.postMessage({ type: 'ready' });

    // Handle window close
    window.addEventListener('beforeunload', () => {
      if (this.channel) {
        this.channel.postMessage({ type: 'closed' });
      }
    });
  }

  private updateDisplay() {
    if (!this.currentState || !this.textInner || !this.displayElement) return;

    const state = this.currentState;

    // Update styles
    this.textInner.style.fontFamily = getFontFamily(state.fontFamily);
    this.textInner.style.fontSize = `${state.fontSize}px`;
    this.textInner.style.color = state.fontColor;
    this.textInner.style.lineHeight = `${state.lineSpacing}`;
    this.textInner.style.letterSpacing = `${state.letterSpacing}px`;
    this.textInner.style.paddingLeft = `${state.horizontalMargin}%`;
    this.textInner.style.paddingRight = `${state.horizontalMargin}%`;

    // Apply RTL
    const textDir = state.textDirection === 'auto'
      ? (isRTL(state.text) ? 'rtl' : 'ltr')
      : state.textDirection;
    this.textInner.dir = textDir;

    // Apply background with opacity
    if (state.overlayOpacity < 1) {
      const rgb = parseHexColor(state.backgroundColor);
      if (rgb) {
        this.displayElement.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${state.overlayOpacity})`;
      } else {
        this.displayElement.style.backgroundColor = state.backgroundColor;
      }
    } else {
      this.displayElement.style.backgroundColor = state.backgroundColor;
    }

    // Apply flip
    this.displayElement.classList.toggle('flipped', state.isFlipped);

    // Apply transform (scroll position + flip)
    const translatePart = `translateY(${state.translateY}px)`;
    const flipX = state.isFlipped ? ' scaleX(-1)' : '';
    const flipY = state.isFlippedVertical ? ' scaleY(-1)' : '';
    this.textInner.style.transform = translatePart + flipX + flipY;

    // Update reading guide
    if (this.readingGuide) {
      this.readingGuide.classList.toggle('enabled', state.readingGuideEnabled);
      const guideHeight = state.fontSize * state.lineSpacing * 1.5;
      this.readingGuide.style.height = `${guideHeight}px`;
    }

    // Update text content
    this.updateText(state.text, state.maxWordsPerLine, state.activeLineIndex);
  }

  private updateText(text: string, maxWordsPerLine: number, activeLineIndex: number) {
    if (!this.textInner) return;

    const fragment = document.createDocumentFragment();
    const lines = splitTextIntoLines(text, maxWordsPerLine);

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineElement = document.createElement('div');
      lineElement.className = 'line';
      lineElement.dataset.index = index.toString();

      if (index === activeLineIndex) {
        lineElement.classList.add('active-line');
      }

      if (line.trim() === '') {
        lineElement.textContent = '\u00A0';
      } else {
        lineElement.textContent = line;
      }

      fragment.appendChild(lineElement);
    }

    // Add spacer
    const spacer = document.createElement('div');
    spacer.style.height = CONFIG.SPACER_HEIGHT;
    spacer.style.pointerEvents = 'none';
    fragment.appendChild(spacer);

    this.textInner.replaceChildren(fragment);
  }

  destroy() {
    if (this.channel) {
      this.channel.postMessage({ type: 'closed' });
      this.channel.close();
      this.channel = null;
    }
  }
}

// Initialize talent app
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('talent-app');
  if (container) {
    new TalentApp(container);
  }
});
