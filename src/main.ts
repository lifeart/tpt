import "./style.css";

const systemFontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

// SVG Icons for Fullscreen Toggle
const fullscreenEnterIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
    <path d="M4 4h6V2H2v8h2V4zm16 0v6h2V2h-8v2h6zm0 16h-6v2h8v-8h-2v6zM4 20v-6H2v8h8v-2H4z"/>
  </svg>
`;

const fullscreenExitIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
    <path d="M16 14h2v4h-4v-2h2v-2zm-8 0v2h2v2H6v-4h2zm8-8v2h-2V6h4v4h-2V8zm-8 2H6V6h4v2H8v2z"/>
  </svg>
`;

// Teleprompter state class
class TeleprompterState {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  lineSpacing: number;
  letterSpacing: number;
  scrollSpeed: number; // Now represents lines per second
  isFlipped: boolean;
  isScrolling: boolean;
  activeLineIndex: number;
  scriptEnded: boolean;
  isFullscreen: boolean;
  maxWordsPerLine: number; // New property to control line word limit

  constructor() {
    this.text =
      "Welcome to the Teleprompter App!\n\nThis is a sample text.\nYou can edit this text and customize how it appears.\n\nUse the controls below to adjust font, colors, spacing, and scroll speed.\n\nPress the Play button to start scrolling.";
    this.fontSize = 32;
    this.fontFamily = systemFontStack;
    this.fontColor = "#ffffff";
    this.backgroundColor = "#000000";
    this.lineSpacing = 1;
    this.letterSpacing = 0;
    this.scrollSpeed = 1.5; // Default 1.5 lines per second
    this.isFlipped = false;
    this.isScrolling = false;
    this.activeLineIndex = 0;
    this.scriptEnded = false;
    this.isFullscreen = false;
    this.maxWordsPerLine = 0; // 0 means no splitting (unlimited words per line)
    this.text =  `${this.text}\n${this.text}\n${this.text}\n${this.text}\n${this.text}`;
  }
}

// Teleprompter Display Component
class TeleprompterDisplay {
  private element: HTMLDivElement;
  private telepromptText: HTMLDivElement;
  private telepromptTextInner: HTMLDivElement; // New inner wrapper
  private activeLineMarker: HTMLDivElement;
  private state: TeleprompterState;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private currentTranslateY: number = 0; // Track current translateY

  constructor(container: HTMLElement, state: TeleprompterState) {
    this.state = state;

    // Create teleprompter container
    this.element = document.createElement("div");
    this.element.className =
      "teleprompter-container flex-grow relative overflow-hidden";
    if (this.state.isFlipped) this.element.classList.add("flipped");
    this.element.style.backgroundColor = this.state.backgroundColor;

    // Create teleprompter text area
    this.telepromptText = document.createElement("div");
    this.telepromptText.id = "teleprompt-text";
    this.telepromptText.className =
      "p-4 text-center whitespace-pre-line teleprompter-hide-scrollbar";
    // Add transition for transform
    this.telepromptText.style.overflow = "hidden";
    this.telepromptText.style.position = "relative";

    // New: inner wrapper for text
    this.telepromptTextInner = document.createElement("div");
    this.telepromptTextInner.className = "teleprompt-text-inner";
    // Using linear transition with dynamic timing based on speed
    this.telepromptTextInner.style.transition = "none"; // Initially no transition, will be set dynamically
    this.telepromptTextInner.style.willChange = "transform";

    // Append telepromptTextInner to telepromptText
    this.telepromptText.appendChild(this.telepromptTextInner);

    this.updateStyles();

    // Create active line marker
    this.activeLineMarker = document.createElement("div");
    this.activeLineMarker.id = "active-line-marker";
    this.activeLineMarker.className = "hidden";

    const leftArrow = document.createElement("div");
    leftArrow.className = "arrow left-arrow";
    leftArrow.textContent = "▶";

    const rightArrow = document.createElement("div");
    rightArrow.className = "arrow right-arrow";
    rightArrow.textContent = "◀";

    this.activeLineMarker.appendChild(leftArrow);
    this.activeLineMarker.appendChild(rightArrow);

    this.element.appendChild(this.telepromptText);
    this.element.appendChild(this.activeLineMarker);

    container.appendChild(this.element);

    this.updateTelepromptText();
    this.setupKeyboardNavigation();
    this.setupCustomEventListeners(); // Add setup for custom events
  }

  private setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      // --- Custom Shortcuts ---
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (ctrlOrCmd) {
          // Cmd/Ctrl + Left/Right: Font size
          if (e.key === "ArrowLeft") {
            this.state.fontSize = Math.max(8, this.state.fontSize - 1);
          } else {
            this.state.fontSize = Math.min(200, this.state.fontSize + 1);
          }
          this.updateStyles();
          // Update font size label and input if present
          const fontSizeLabel = document.querySelector(
            'label[for="font-size"]'
          ) as HTMLLabelElement;
          if (fontSizeLabel)
            fontSizeLabel.textContent = `Font Size: ${this.state.fontSize}px`;
          const fontSizeInput = document.getElementById(
            "font-size"
          ) as HTMLInputElement;
          if (fontSizeInput)
            fontSizeInput.value = this.state.fontSize.toString();
        } else {
          // Left/Right: Scroll speed in lines per second
          if (e.key === "ArrowLeft") {
            this.state.scrollSpeed = Math.max(0.1, this.state.scrollSpeed - 0.1);
          } else {
            this.state.scrollSpeed = Math.min(5, this.state.scrollSpeed + 0.1);
          }
          // Round to 1 decimal place for cleaner display
          this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
          
          // Update label if present
          const scrollSpeedLabel = document.querySelector(
            'label[for="scroll-speed"]'
          ) as HTMLLabelElement;
          if (scrollSpeedLabel)
            scrollSpeedLabel.textContent = `Scroll Speed: ${this.state.scrollSpeed} lines/sec`;
          const scrollSpeedInput = document.getElementById(
            "scroll-speed"
          ) as HTMLInputElement;
          if (scrollSpeedInput)
            scrollSpeedInput.value = this.state.scrollSpeed.toString();
        }
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (ctrlOrCmd) {
          // Ctrl/Cmd + Up/Down: Line spacing
          if (e.key === "ArrowUp") {
            this.state.lineSpacing = Math.min(3, this.state.lineSpacing + 0.1);
          } else {
            this.state.lineSpacing = Math.max(1, this.state.lineSpacing - 0.1);
          }
          this.state.lineSpacing = Math.round(this.state.lineSpacing * 10) / 10;
          this.updateStyles();
          // Update label if present
          const lineSpacingLabel = document.querySelector(
            'label[for="line-spacing"]'
          ) as HTMLLabelElement;
          if (lineSpacingLabel)
            lineSpacingLabel.textContent = `Line Spacing: ${this.state.lineSpacing}`;
          const lineSpacingInput = document.getElementById(
            "line-spacing"
          ) as HTMLInputElement;
          if (lineSpacingInput)
            lineSpacingInput.value = this.state.lineSpacing.toString();
        } else if (!this.state.isScrolling) {
          // Up/Down: Move active line only if not playing
          if (e.key === "ArrowUp") {
            this.state.activeLineIndex = Math.max(
              0,
              this.state.activeLineIndex - 1
            );
          } else {
            const lines = this.state.text.split("\n");
            this.state.activeLineIndex = Math.min(
              lines.length - 1,
              this.state.activeLineIndex + 1
            );
          }
          // Scroll to the active line
          const targetLine = this.element.querySelector(
            `.line[data-index="${this.state.activeLineIndex}"]`
          ) as HTMLElement;
          if (targetLine) {
            targetLine.scrollIntoView({ behavior: "smooth", block: "center" });
            this.updateTelepromptText();
          }
        }
        e.preventDefault();
        return;
      }
      if (e.key === " ") {
        // Space bar toggles play/pause
        this.toggleScrolling();
        e.preventDefault();
      }
    });
  }

  updateTelepromptText() {
    if (!this.telepromptTextInner) return;

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    // Split text into lines
    const inputLines = this.state.text.split("\n");
    
    // Process lines with maxWordsPerLine if enabled
    const lines: string[] = [];
    
    // Process each line, potentially splitting by word limit
    inputLines.forEach(line => {
      if (this.state.maxWordsPerLine > 0 && line.trim() !== "") {
        // Split the line into words
        const words = line.trim().split(/\s+/);
        
        // If we have more words than the limit, we need to split the line
        if (words.length > this.state.maxWordsPerLine) {
          // Create chunks of words based on the max words per line
          for (let i = 0; i < words.length; i += this.state.maxWordsPerLine) {
            const chunk = words.slice(i, i + this.state.maxWordsPerLine).join(" ");
            lines.push(chunk);
          }
        } else {
          // Line is already within the limit
          lines.push(line);
        }
      } else {
        // No word limit or empty line
        lines.push(line);
      }
    });

    // Clear existing content
    while (this.telepromptTextInner.firstChild) {
      this.telepromptTextInner.removeChild(this.telepromptTextInner.firstChild);
    }

    // Create elements in batches to reduce reflow
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineElement = document.createElement("div");
      lineElement.className = "line";
      lineElement.dataset.index = index.toString();

      if (index === this.state.activeLineIndex) {
        lineElement.classList.add("active-line");
      }

      if (line.trim() === "") {
        // For empty lines, add a non-breaking space to maintain height
        lineElement.innerHTML = "&nbsp;"; // More efficient than createTextNode
      } else {
        lineElement.textContent = line;
      }

      fragment.appendChild(lineElement);
    }

    // Add spacer at the end for half the container height
    const spacer = document.createElement("div");
    spacer.style.height = "50vh";
    spacer.style.pointerEvents = "none";
    fragment.appendChild(spacer);

    // Append all elements at once
    this.telepromptTextInner.appendChild(fragment);

    // Update marker position on next frame for better performance
    requestAnimationFrame(() => {
      this.updateActiveLineMarker();
    });
  }

  updateActiveLineMarker() {
    const activeLineElement = this.element.querySelector(".active-line");

    if (activeLineElement && this.activeLineMarker) {
      // Use getBoundingClientRect only once and store the values
      const rect = activeLineElement.getBoundingClientRect();

      // Check if the position actually changed before updating styles
      const newTop = `${rect.top}px`;
      const newHeight = `${rect.height}px`;

      if (
        this.activeLineMarker.style.top !== newTop ||
        this.activeLineMarker.style.height !== newHeight
      ) {
        // Use style.display = "block" only if it's currently hidden
        if (this.activeLineMarker.style.display !== "block") {
          this.activeLineMarker.style.display = "block";
        }

        // Batch style updates to minimize reflows
        requestAnimationFrame(() => {
          this.activeLineMarker.style.top = newTop;
          this.activeLineMarker.style.height = newHeight;
        });
      }
    }
  }

  private animateScroll = (timestamp: number = performance.now()) => {
    if (!this.state.isScrolling || !this.telepromptTextInner) {
      return;
    }

    // Calculate how much to scroll based on time difference and lines per second
    const elapsed = timestamp - this.lastTimestamp;
    
    // Get average line height to calculate pixels per line
    const lines = this.element.querySelectorAll(".line");
    let avgLineHeight = 0;
    
    if (lines.length > 0) {
      // Calculate average line height from visible lines for better accuracy
      const visibleLines = Array.from(lines).slice(
        Math.max(0, this.state.activeLineIndex - 2),
        Math.min(lines.length, this.state.activeLineIndex + 3)
      );
      
      if (visibleLines.length > 0) {
        avgLineHeight = visibleLines.reduce((sum, line) => {
          return sum + line.getBoundingClientRect().height;
        }, 0) / visibleLines.length;
      }
    }
    
    // Default if we couldn't calculate (e.g., first frame)
    if (avgLineHeight === 0) {
      avgLineHeight = this.state.fontSize * this.state.lineSpacing;
    }
    
    // Calculate scroll amount based on lines per second
    const pixelsPerSecond = avgLineHeight * this.state.scrollSpeed;
    const scrollAmount = (elapsed * pixelsPerSecond) / 1000;

    // Remove any transition when actively animating for immediate response
    this.telepromptTextInner.style.transition = "none";
    
    // Update translateY position
    this.currentTranslateY -= scrollAmount;
    this.telepromptTextInner.style.transform = `translateY(${this.currentTranslateY}px)`;
    this.lastTimestamp = timestamp;

    // Don't update the active line on every frame, only every few frames
    // Using a throttling approach to reduce DOM operations
    const shouldUpdateActiveLine =
      Math.floor(timestamp / 10) !== Math.floor(this.lastTimestamp / 10);
      
    if (shouldUpdateActiveLine) {
      // Update active line with optimized approach
      this.updateActiveLine();
    }

    // Check if we've reached the end
    const totalHeight = this.telepromptTextInner.scrollHeight;
    const containerHeight = this.telepromptText.clientHeight;
    if (Math.abs(this.currentTranslateY) + containerHeight >= totalHeight - 5 && !this.state.scriptEnded) {
      this.toggleScrolling(); // Auto-pause when reaching the end
      this.state.scriptEnded = true; // Set flag when script ends
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
      return;
    }

    // Continue the animation with requestAnimationFrame
    this.animationFrameId = window.requestAnimationFrame(this.animateScroll);
  };

  toggleScrolling() {
    if (this.state.isScrolling) {
      // Stop scrolling
      if (this.animationFrameId !== null) {
        window.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.state.isScrolling = false;
    } else {
      // Start scrolling
      if (this.state.scriptEnded && this.telepromptTextInner) {
        // Reset to start
        this.currentTranslateY = 0;
        this.telepromptTextInner.style.transform = `translateY(0px)`;
        this.state.activeLineIndex = 0;
        this.state.scriptEnded = false;
        this.updateTelepromptText(); // Update display to show reset state
      }

      this.state.isScrolling = true;
      this.lastTimestamp = performance.now();
      this.animationFrameId = window.requestAnimationFrame(this.animateScroll);
    }
    // Notify that scrolling state changed
    const event = new CustomEvent("scrolling-toggled", {
      detail: { isScrolling: this.state.isScrolling },
    });
    document.dispatchEvent(event);
  }

  private setupCustomEventListeners() {
    document.addEventListener("back-to-top", () => {
      // When going back to top, apply a smooth transition
      if (this.telepromptTextInner) {
        // Calculate appropriate transition duration based on current position and speed
        const distanceToTop = Math.abs(this.currentTranslateY);
        const avgLineHeight = this.state.fontSize * this.state.lineSpacing;
        const pixelsPerSecond = avgLineHeight * this.state.scrollSpeed;
        const transitionDuration = Math.min(0.5, distanceToTop / (pixelsPerSecond * 2));
        
        this.telepromptTextInner.style.transition = `transform ${transitionDuration}s linear`;
        this.currentTranslateY = 0;
        this.telepromptTextInner.style.transform = `translateY(0px)`;
        
        // Reset to no transition after animation is done
        setTimeout(() => {
          if (this.telepromptTextInner) {
            this.telepromptTextInner.style.transition = "none";
          }
        }, transitionDuration * 1000);
      }
      
      this.state.activeLineIndex = 0;
      this.updateTelepromptText();
    });
  }

  updateStyles() {
    if (!this.telepromptTextInner) return;
    this.telepromptTextInner.style.fontFamily = this.state.fontFamily;
    this.telepromptTextInner.style.fontSize = `${this.state.fontSize}px`;
    this.telepromptTextInner.style.color = this.state.fontColor;
    this.telepromptTextInner.style.lineHeight = `${this.state.lineSpacing}`;
    this.telepromptTextInner.style.letterSpacing = `${this.state.letterSpacing}px`;
    if (this.element) {
      this.element.style.backgroundColor = this.state.backgroundColor;
      this.element.classList.toggle("flipped", this.state.isFlipped);
    }
    if (this.state.isFlipped) {
      this.telepromptTextInner.style.transform += " scale(-1, 1)";
    } else {
      // Remove scale(-1, 1) if present
      this.telepromptTextInner.style.transform = this.telepromptTextInner.style.transform.replace(/scale\(-1, 1\)/, "");
    }
    // Reset scriptEnded flag if text changes or styles affecting layout change
    this.state.scriptEnded = false;
    this.updateTelepromptText();
  }

  private updateActiveLine() {
    if (!this.telepromptTextInner) return;

    // Use the bounding client rect to find which line is at the center of the screen
    const containerRect = this.telepromptText.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    
    // Find all line elements
    const lines = this.element.querySelectorAll(".line");
    let newActiveIndex = -1;
    
    // Find which line is closest to center
    let minDistance = Infinity;
    lines.forEach((line: Element, index: number) => {
      const lineRect = line.getBoundingClientRect();
      const lineCenter = lineRect.top + lineRect.height / 2;
      const distance = Math.abs(lineCenter - containerCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        newActiveIndex = index;
      }
    });
    
    // Update the active line
    if (newActiveIndex >= 0 && newActiveIndex !== this.state.activeLineIndex) {
      this.state.activeLineIndex = newActiveIndex;
      this.updateActiveLineMarker();
    }
  }
}

// Teleprompter Controls Component
class TeleprompterControls {
  private element: HTMLDivElement;
  private state: TeleprompterState;
  private onStateChange: () => void;
  private fontOptions = [
    "System",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Roboto",
    "Open Sans",
  ];
  private fullscreenBtn: HTMLButtonElement | null = null; // Add reference for fullscreen button
  private appNodes: {
    scriptInput: HTMLTextAreaElement;
    fontFamilySelect: HTMLSelectElement;
    fontSizeInput: HTMLInputElement;
    fontColorInput: HTMLInputElement;
    bgColorInput: HTMLInputElement;
    lineSpacingInput: HTMLInputElement;
    letterSpacingInput: HTMLInputElement;
    scrollSpeedInput: HTMLInputElement;
    maxWordsPerLineInput: HTMLInputElement; // Add new input field
    flipBtn: HTMLButtonElement;
    playPauseBtn: HTMLButtonElement;
    backToTopBtn: HTMLButtonElement;
    fullscreenBtn: HTMLButtonElement;
    // Add direct references to labels
    fontSizeLabel: HTMLLabelElement;
    lineSpacingLabel: HTMLLabelElement;
    letterSpacingLabel: HTMLLabelElement;
    scrollSpeedLabel: HTMLLabelElement;
    maxWordsPerLineLabel: HTMLLabelElement; // Add new label
  };

  constructor(
    container: HTMLElement,
    state: TeleprompterState,
    onStateChange: () => void
  ) {
    this.state = state;
    this.onStateChange = onStateChange;

    this.element = document.createElement("div");
    this.element.className = "controls-panel bg-gray-800 p-4 relative"; // Keep relative positioning

    // Initialize appNodes
    this.appNodes = {
      scriptInput: document.createElement("textarea"),
      fontFamilySelect: document.createElement("select"),
      fontSizeInput: document.createElement("input"),
      fontColorInput: document.createElement("input"),
      bgColorInput: document.createElement("input"),
      lineSpacingInput: document.createElement("input"),
      letterSpacingInput: document.createElement("input"),
      scrollSpeedInput: document.createElement("input"),
      maxWordsPerLineInput: document.createElement("input"),
      flipBtn: document.createElement("button"),
      playPauseBtn: document.createElement("button"),
      backToTopBtn: document.createElement("button"),
      fullscreenBtn: document.createElement("button"),
      // Add direct references to labels
      fontSizeLabel: document.createElement("label"),
      lineSpacingLabel: document.createElement("label"),
      letterSpacingLabel: document.createElement("label"),
      scrollSpeedLabel: document.createElement("label"),
      maxWordsPerLineLabel: document.createElement("label"),
    };

    this.render();
    container.appendChild(this.element);
    this.setupEventListeners();
    this.setupFullscreenListener(); // Add listener for fullscreen changes
    this.handleFullscreenPanelVisibility(); // Initial check
  }

  private render() {
    const controlsGrid = document.createElement("div");
    controlsGrid.className = "grid grid-cols-2 md:grid-cols-4 gap-4";

    // Text Input
    const textInputContainer = document.createElement("div");
    textInputContainer.className = "col-span-2 md:col-span-4";

    const scriptLabel = document.createElement("label");
    scriptLabel.className = "block text-sm font-medium text-gray-300";
    scriptLabel.textContent = "Script";

    this.appNodes.scriptInput.id = "script-input";
    this.appNodes.scriptInput.className =
      "w-full h-24 p-2 rounded bg-gray-700 text-white";
    this.appNodes.scriptInput.value = this.state.text;

    textInputContainer.appendChild(scriptLabel);
    textInputContainer.appendChild(this.appNodes.scriptInput);
    controlsGrid.appendChild(textInputContainer);

    // Font Family
    const fontFamilyContainer = document.createElement("div");

    const fontFamilyLabel = document.createElement("label");
    fontFamilyLabel.className = "block text-sm font-medium text-gray-300";
    fontFamilyLabel.textContent = "Font";

    this.appNodes.fontFamilySelect.id = "font-family";
    this.appNodes.fontFamilySelect.className =
      "w-full p-2 rounded bg-gray-700 text-white";

    this.fontOptions.forEach((font) => {
      const option = document.createElement("option");
      option.value = font;
      option.textContent = font;
      if (this.state.fontFamily === font) {
        option.selected = true;
      }
      this.appNodes.fontFamilySelect.appendChild(option);
    });

    fontFamilyContainer.appendChild(fontFamilyLabel);
    fontFamilyContainer.appendChild(this.appNodes.fontFamilySelect);
    controlsGrid.appendChild(fontFamilyContainer);

    // Font Size
    const fontSizeContainer = document.createElement("div");

    this.appNodes.fontSizeLabel.htmlFor = "font-size";
    this.appNodes.fontSizeLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.fontSizeLabel.textContent = `Font Size: ${this.state.fontSize}px`;

    this.appNodes.fontSizeInput.id = "font-size";
    this.appNodes.fontSizeInput.type = "range";
    this.appNodes.fontSizeInput.min = "16";
    this.appNodes.fontSizeInput.max = "72";
    this.appNodes.fontSizeInput.value = this.state.fontSize.toString();
    this.appNodes.fontSizeInput.className = "w-full";

    fontSizeContainer.appendChild(this.appNodes.fontSizeLabel);
    fontSizeContainer.appendChild(this.appNodes.fontSizeInput);
    controlsGrid.appendChild(fontSizeContainer);

    // Font Color
    const fontColorContainer = document.createElement("div");

    const fontColorLabel = document.createElement("label");
    fontColorLabel.className = "block text-sm font-medium text-gray-300";
    fontColorLabel.textContent = "Font Color";

    this.appNodes.fontColorInput.id = "font-color";
    this.appNodes.fontColorInput.type = "color";
    this.appNodes.fontColorInput.value = this.state.fontColor;
    this.appNodes.fontColorInput.className =
      "w-full h-10 p-1 rounded bg-gray-700";

    fontColorContainer.appendChild(fontColorLabel);
    fontColorContainer.appendChild(this.appNodes.fontColorInput);
    controlsGrid.appendChild(fontColorContainer);

    // Background Color
    const bgColorContainer = document.createElement("div");

    const bgColorLabel = document.createElement("label");
    bgColorLabel.className = "block text-sm font-medium text-gray-300";
    bgColorLabel.textContent = "Background Color";

    this.appNodes.bgColorInput.id = "bg-color";
    this.appNodes.bgColorInput.type = "color";
    this.appNodes.bgColorInput.value = this.state.backgroundColor;
    this.appNodes.bgColorInput.className =
      "w-full h-10 p-1 rounded bg-gray-700";

    bgColorContainer.appendChild(bgColorLabel);
    bgColorContainer.appendChild(this.appNodes.bgColorInput);
    controlsGrid.appendChild(bgColorContainer);

    // Line Spacing
    const lineSpacingContainer = document.createElement("div");

    this.appNodes.lineSpacingLabel.htmlFor = "line-spacing";
    this.appNodes.lineSpacingLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.lineSpacingLabel.textContent = `Line Spacing: ${this.state.lineSpacing}`;

    this.appNodes.lineSpacingInput.id = "line-spacing";
    this.appNodes.lineSpacingInput.type = "range";
    this.appNodes.lineSpacingInput.min = "0.5";
    this.appNodes.lineSpacingInput.max = "2";
    this.appNodes.lineSpacingInput.step = "0.1";
    this.appNodes.lineSpacingInput.value = this.state.lineSpacing.toString();
    this.appNodes.lineSpacingInput.className = "w-full";

    lineSpacingContainer.appendChild(this.appNodes.lineSpacingLabel);
    lineSpacingContainer.appendChild(this.appNodes.lineSpacingInput);
    controlsGrid.appendChild(lineSpacingContainer);

    // Letter Spacing
    const letterSpacingContainer = document.createElement("div");

    this.appNodes.letterSpacingLabel.htmlFor = "letter-spacing";
    this.appNodes.letterSpacingLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.letterSpacingLabel.textContent = `Letter Spacing: ${this.state.letterSpacing}px`;

    this.appNodes.letterSpacingInput.id = "letter-spacing";
    this.appNodes.letterSpacingInput.type = "range";
    this.appNodes.letterSpacingInput.min = "0";
    this.appNodes.letterSpacingInput.max = "10";
    this.appNodes.letterSpacingInput.value =
      this.state.letterSpacing.toString();
    this.appNodes.letterSpacingInput.className = "w-full";

    letterSpacingContainer.appendChild(this.appNodes.letterSpacingLabel);
    letterSpacingContainer.appendChild(this.appNodes.letterSpacingInput);
    controlsGrid.appendChild(letterSpacingContainer);

    // Scroll Speed
    const scrollSpeedContainer = document.createElement("div");

    this.appNodes.scrollSpeedLabel.htmlFor = "scroll-speed";
    this.appNodes.scrollSpeedLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.scrollSpeedLabel.textContent = `Scroll Speed: ${this.state.scrollSpeed} lines/sec`;

    this.appNodes.scrollSpeedInput.id = "scroll-speed";
    this.appNodes.scrollSpeedInput.type = "range";
    this.appNodes.scrollSpeedInput.min = "0.1";
    this.appNodes.scrollSpeedInput.max = "8";
    this.appNodes.scrollSpeedInput.step = "0.1"; // Add step for finer control
    this.appNodes.scrollSpeedInput.value = this.state.scrollSpeed.toString();
    this.appNodes.scrollSpeedInput.className = "w-full";

    scrollSpeedContainer.appendChild(this.appNodes.scrollSpeedLabel);
    scrollSpeedContainer.appendChild(this.appNodes.scrollSpeedInput);
    controlsGrid.appendChild(scrollSpeedContainer);

    // Max Words Per Line
    const maxWordsPerLineContainer = document.createElement("div");

    this.appNodes.maxWordsPerLineLabel.htmlFor = "max-words-per-line";
    this.appNodes.maxWordsPerLineLabel.className =
      "block text-sm font-medium text-gray-300";
    this.appNodes.maxWordsPerLineLabel.textContent = `Max Words/Line: ${this.state.maxWordsPerLine}`;

    this.appNodes.maxWordsPerLineInput.id = "max-words-per-line";
    this.appNodes.maxWordsPerLineInput.type = "number";
    this.appNodes.maxWordsPerLineInput.min = "0";
    this.appNodes.maxWordsPerLineInput.value = this.state.maxWordsPerLine.toString();
    this.appNodes.maxWordsPerLineInput.className = "w-full";

    maxWordsPerLineContainer.appendChild(this.appNodes.maxWordsPerLineLabel);
    maxWordsPerLineContainer.appendChild(this.appNodes.maxWordsPerLineInput);
    controlsGrid.appendChild(maxWordsPerLineContainer);

    // Flip Screen
    const flipContainer = document.createElement("div");

    const flipLabel = document.createElement("label");
    flipLabel.className = "block text-sm font-medium text-gray-300";
    flipLabel.textContent = "Flip Screen";

    this.appNodes.flipBtn.id = "flip-btn";
    this.appNodes.flipBtn.className =
      "w-full p-2 rounded bg-blue-600 hover:bg-blue-700 text-white";
    this.appNodes.flipBtn.textContent = this.state.isFlipped
      ? "Unflip"
      : "Flip";

    flipContainer.appendChild(flipLabel);
    flipContainer.appendChild(this.appNodes.flipBtn);
    controlsGrid.appendChild(flipContainer); // Add flip container to the grid

    // Play/Pause Button Container (Should be outside the grid)
    const playPauseContainer = document.createElement("div");
    playPauseContainer.className = "mt-4 text-center col-span-2 md:col-span-4"; // Spanning full width below grid

    this.appNodes.playPauseBtn.id = "play-pause-btn";
    this.appNodes.playPauseBtn.className =
      "px-6 py-2 rounded bg-green-600 hover:bg-green-700 text-white";
    this.appNodes.playPauseBtn.textContent = this.state.isScrolling
      ? "Pause"
      : "Play";

    // Create Back to Top button
    this.appNodes.backToTopBtn.id = "back-to-top-btn";
    this.appNodes.backToTopBtn.className =
      "px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white ml-4"; // Added margin-left for spacing
    this.appNodes.backToTopBtn.textContent = "Back to Top";

    playPauseContainer.appendChild(this.appNodes.playPauseBtn); // Add play/pause button to its container
    playPauseContainer.appendChild(this.appNodes.backToTopBtn); // Add back to top button to the container

    // Fullscreen Button (Positioned absolutely within the main element)
    this.appNodes.fullscreenBtn.id = "fullscreen-btn";
    this.appNodes.fullscreenBtn.className =
      "absolute bottom-4 right-4 p-2 rounded bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center"; // Adjusted classes
    this.appNodes.fullscreenBtn.setAttribute("aria-label", "Toggle Fullscreen"); // Accessibility
    this.updateFullscreenButtonIcon(); // Set initial icon

    // Assemble the controls panel
    this.element.appendChild(controlsGrid); // Add the grid first
    this.element.appendChild(playPauseContainer); // Add play/pause container below grid
    this.element.appendChild(this.appNodes.fullscreenBtn); // Add fullscreen button (absolutely positioned)
  }

  setupEventListeners() {
    // Script input
    this.appNodes.scriptInput.addEventListener("input", () => {
      this.state.text = this.appNodes.scriptInput.value;
      this.state.scriptEnded = false; // Reset flag on text change
      this.onStateChange();
    });

    // Font family
    this.appNodes.fontFamilySelect.addEventListener("change", () => {
      this.state.fontFamily = this.appNodes.fontFamilySelect.value;
      this.onStateChange();
    });

    // Font size
    this.appNodes.fontSizeInput.addEventListener("input", () => {
      this.state.fontSize = this.appNodes.fontSizeInput.valueAsNumber;
      this.onStateChange();
      // Update label using direct reference
      this.appNodes.fontSizeLabel.textContent = `Font Size: ${this.state.fontSize}px`;
    });

    // Font color
    this.appNodes.fontColorInput.addEventListener("input", () => {
      this.state.fontColor = this.appNodes.fontColorInput.value;
      this.onStateChange();
    });

    // Background color
    this.appNodes.bgColorInput.addEventListener("input", () => {
      this.state.backgroundColor = this.appNodes.bgColorInput.value;
      this.onStateChange();
    });

    // Line spacing
    this.appNodes.lineSpacingInput.addEventListener("input", () => {
      this.state.lineSpacing = parseFloat(this.appNodes.lineSpacingInput.value);
      this.onStateChange();
      // Update label using direct reference
      this.appNodes.lineSpacingLabel.textContent = `Line Spacing: ${this.state.lineSpacing}`;
    });

    // Letter spacing
    this.appNodes.letterSpacingInput.addEventListener("input", () => {
      this.state.letterSpacing = this.appNodes.letterSpacingInput.valueAsNumber;
      this.onStateChange();
      // Update label using direct reference
      this.appNodes.letterSpacingLabel.textContent = `Letter Spacing: ${this.state.letterSpacing}px`;
    });

    // Scroll speed
    this.appNodes.scrollSpeedInput.addEventListener("input", () => {
      this.state.scrollSpeed = parseFloat(this.appNodes.scrollSpeedInput.value);
      // Round to 1 decimal place for cleaner display
      this.state.scrollSpeed = Math.round(this.state.scrollSpeed * 10) / 10;
      this.onStateChange(); 
      // Update label with new units
      this.appNodes.scrollSpeedLabel.textContent = `Scroll Speed: ${this.state.scrollSpeed} lines/sec`;
    });

    // Max Words Per Line
    this.appNodes.maxWordsPerLineInput.addEventListener("input", () => {
      this.state.maxWordsPerLine = this.appNodes.maxWordsPerLineInput.valueAsNumber;
      this.onStateChange();
      // Update label using direct reference
      this.appNodes.maxWordsPerLineLabel.textContent = `Max Words/Line: ${this.state.maxWordsPerLine}`;
    });

    // Flip screen button
    this.appNodes.flipBtn.addEventListener("click", () => {
      this.state.isFlipped = !this.state.isFlipped;
      this.onStateChange();
      this.appNodes.flipBtn.textContent = this.state.isFlipped
        ? "Unflip"
        : "Flip";
    });

    // Play/Pause button
    this.appNodes.playPauseBtn.addEventListener("click", () => {
      const event = new CustomEvent("toggle-scrolling");
      document.dispatchEvent(event);
    });

    // Back to Top button
    this.appNodes.backToTopBtn.addEventListener("click", () => {
      const event = new CustomEvent("back-to-top");
      document.dispatchEvent(event);
    });

    // Fullscreen button
    this.appNodes.fullscreenBtn.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Listen for scrolling state changes
    document.addEventListener("scrolling-toggled", (e: any) => {
      this.appNodes.playPauseBtn.textContent = e.detail.isScrolling
        ? "Pause"
        : "Play";
    });
  }

  private toggleFullscreen() {
    const appRoot = document.documentElement; // Target the whole page for fullscreen

    if (!document.fullscreenElement) {
      appRoot.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    // No need to manually update icon here, fullscreenchange listener handles it
  }

  // Renamed from updateFullscreenButtonText
  private updateFullscreenButtonIcon() {
    if (this.fullscreenBtn) {
      // Set innerHTML to the appropriate SVG string
      this.fullscreenBtn.innerHTML = document.fullscreenElement
        ? fullscreenExitIcon
        : fullscreenEnterIcon;
    }
  }

  // Listen for fullscreen changes (e.g., user pressing ESC)
  private setupFullscreenListener() {
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenButtonIcon(); // Call the updated method
      this.handleFullscreenPanelVisibility(); // Hide/show panel except button
    });
  }

  private handleFullscreenPanelVisibility() {
    // Hide the controls panel except the fullscreen button in fullscreen mode
    const isFullscreen = !!document.fullscreenElement;
    // Hide all children except the fullscreen button
    Array.from(this.element.children).forEach((child) => {
      if (child === this.fullscreenBtn) {
        (child as HTMLElement).style.display = "flex";
      } else {
        (child as HTMLElement).style.display = isFullscreen ? "none" : "";
      }
    });
    // Always show the fullscreen button
    if (this.fullscreenBtn) {
      this.fullscreenBtn.style.display = "flex";
    }
  }
}

// Main Teleprompter App
class TeleprompterApp {
  private appElement: HTMLDivElement;
  private state: TeleprompterState;
  private display: TeleprompterDisplay | null = null;
  private controls: TeleprompterControls | null = null;

  constructor(appElement: HTMLDivElement) {
    this.appElement = appElement;
    this.state = new TeleprompterState();

    // Setup the app container
    this.setupAppContainer();

    // Initialize components
    this.initializeComponents();

    // Setup event listeners for component communication
    this.setupComponentCommunication();
  }

  private setupAppContainer() {
    // Clear the app container
    while (this.appElement.firstChild) {
      this.appElement.removeChild(this.appElement.firstChild);
    }

    // Create main container
    const mainContainer = document.createElement("div");
    mainContainer.className = "flex flex-col h-screen";

    this.appElement.appendChild(mainContainer);
  }

  private initializeComponents() {
    const mainContainer = this.appElement.querySelector(
      ".flex-col"
    ) as HTMLElement;
    if (!mainContainer) return;

    // Initialize display component
    this.display = new TeleprompterDisplay(mainContainer, this.state);

    // Initialize controls component
    this.controls = new TeleprompterControls(mainContainer, this.state, () => {
      if (this.display) {
        this.display.updateStyles();
      }
    });
  }

  private setupComponentCommunication() {
    // Handle toggle scrolling event
    document.addEventListener("toggle-scrolling", () => {
      if (this.display) {
        this.display.toggleScrolling();
      }
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const appElement = document.querySelector<HTMLDivElement>("#app");
  if (appElement) {
    new TeleprompterApp(appElement);
  }
});
