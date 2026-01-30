# Teleprompter App

A professional, free teleprompter web application for video creators, YouTubers, streamers, and public speakers. Works entirely in your browser with no sign-up required.

**[Live Demo](https://lifeart.github.io/tpt/)**

## Features

### Core Teleprompter
- **Adjustable Scroll Speed** - Fine-tune reading pace (0.1-8 lines/second)
- **WPM Display** - See words-per-minute alongside scroll speed
- **3-2-1 Countdown** - Professional countdown before scrolling begins
- **Smooth Speed Ramping** - Natural ease-in/ease-out transitions
- **Reading Guide** - Visual focus area to help track the current line
- **Cue Points/Markers** - Mark important sections, jump between them with Shift+Arrow keys

### Display Modes
- **Continuous Scroll** - Traditional auto-scrolling teleprompter
- **Paging Mode** - Advance page-by-page with Space/Enter (great for speeches)
- **Voice-Follow Mode** - Auto-scroll based on your speech using Web Speech API
- **Mirror/Flip Mode** - Horizontal and vertical flip for beam-splitter rigs
- **Fullscreen Mode** - Distraction-free reading

### Customization
- **Font Size** - 16px to 72px range
- **Font Family** - 10 fonts including dyslexia-friendly options (Lexend, OpenDyslexic)
- **Colors** - Customizable text and background colors
- **Theme Presets** - Dark, Light, High Contrast, Low Light, Sepia (WCAG compliant)
- **Line Spacing** - 0.5x to 3x
- **Letter Spacing** - 0-10px
- **Word Limit Per Line** - Control text wrapping
- **Horizontal Margins** - Reduce eye movement with adjustable side margins
- **Overlay Transparency** - Semi-transparent background for video call overlays

### Remote Control & Multi-Display
- **Remote Control Tab** - Control the teleprompter from a separate browser tab/device
- **Talent Display** - Dedicated clean display window for the speaker
- **Gamepad/Controller Support** - Use Xbox, PlayStation, or USB controllers
- **Real-time Sync** - All windows stay perfectly synchronized

### Editing & Export
- **Inline Editing** - Double-click any line to edit without opening the editor
- **Import/Export TXT** - Load and save scripts as text files
- **SRT Subtitle Export** - Generate subtitle files based on scroll timing
- **Auto-Save** - Scripts automatically saved to browser localStorage

### Accessibility & Internationalization
- **RTL Language Support** - Auto-detection for Hebrew, Arabic, Persian, Urdu
- **5 Languages** - English, Russian, French, Spanish, German
- **Keyboard Shortcuts** - Full keyboard control for hands-free operation
- **WCAG Contrast Checker** - Visual indicator for text/background contrast ratio
- **Screen Reader Support** - ARIA labels and semantic HTML

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Play/Pause | `Space` |
| Adjust Speed | `Left/Right Arrow` |
| Navigate Lines | `Up/Down Arrow` |
| Font Size | `Ctrl/Cmd + Left/Right Arrow` |
| Line Spacing | `Ctrl/Cmd + Up/Down Arrow` |
| Toggle Cue Point | `M` |
| Jump to Cue Point | `Shift + Up/Down Arrow` |
| Back to Top | `Home` |
| Show Help | `?` |
| Close Dialog | `Escape` |

## Gamepad Controls

| Action | Button |
|--------|--------|
| Play/Pause | A / X |
| Reset to Top | B / Circle |
| Speed Up | Right Trigger (hold) |
| Speed Down | Left Trigger (hold) |
| Navigate Lines | D-pad Up/Down |
| Jump Cue Points | D-pad Left/Right |

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core Teleprompter | Yes | Yes | Yes | Yes |
| Remote Control | Yes | Yes | Yes (14+) | Yes |
| Voice-Follow | Yes | No | Partial | Yes |
| Gamepad | Yes | Yes | Yes | Yes |

## Getting Started

### Use Online
Visit the [live demo](https://lifeart.github.io/tpt/) - no installation required.

### Run Locally

```bash
# Clone the repository
git clone https://github.com/lifeart/tpt.git
cd tpt

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
npm run dev      # Start dev server on port 4205
npm run build    # Build for production
npm run preview  # Preview production build
```

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Web APIs** - BroadcastChannel, Web Speech, Gamepad, Fullscreen
- **Zero Runtime Dependencies** - No external npm packages at runtime

## Privacy

- All data stays in your browser (localStorage)
- No accounts, no tracking, no analytics
- Works completely offline after first load
- Voice recognition (if used) is processed by your browser, not sent to servers

## License

MIT License - free for personal and commercial use.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Credits

Created with care for content creators everywhere.
