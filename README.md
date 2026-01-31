# Free Online Teleprompter for Video Creators

The best free teleprompter app for YouTubers, streamers, podcasters, and public speakers. No sign-up. No downloads. Works in your browser.

[![Try Free Teleprompter](https://img.shields.io/badge/Try_Now-Free_Teleprompter-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://lifeart.github.io/tpt/)
[![GitHub Stars](https://img.shields.io/github/stars/lifeart/tpt?style=for-the-badge&logo=github)](https://github.com/lifeart/tpt)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

![Teleprompter App Screenshot](https://lifeart.github.io/tpt/screenshot.png)

---

## Use It Now — No Installation

**[Open Free Teleprompter](https://lifeart.github.io/tpt/)** — paste your script, press Space, start reading.

Works on desktop, tablet, and mobile. Your script saves automatically.

---

## Why Choose This Teleprompter?

| | This App | Paid Apps | Other Free |
|--|:--:|:--:|:--:|
| Completely free | Yes | No | Ads |
| No account needed | Yes | No | Sometimes |
| Voice-activated scrolling | Yes | Rare | No |
| Remote control from phone | Yes | Paid feature | No |
| Gamepad/pedal support | Yes | Rare | No |
| Works offline | Yes | Sometimes | No |
| Privacy-focused | Yes | No | No |

---

## Features

### 4 Reading Modes

- **Auto-Scroll** — Classic teleprompter with adjustable speed (0.1–8 lines/sec)
- **Page Mode** — Tap to advance, perfect for speeches
- **Voice-Follow** — Scrolls as you speak, hands-free
- **RSVP** — Speed reading, one word at a time (150–600 WPM)

### Professional Controls

- 3-2-1 countdown before start
- Cue points to mark important sections
- Mirror/flip for beam-splitter rigs
- Real-time WPM display

### Multi-Screen Setup

Control from one device, read from another:

| Window | URL | Use |
|--------|-----|-----|
| Main | `/tpt/` | Full editor + display |
| Remote | `/tpt/remote.html` | Phone/tablet controller |
| Talent | `/tpt/talent.html` | Clean speaker display |

All windows sync in real-time via BroadcastChannel API.

### Accessibility

- 10 fonts including **Lexend** and **OpenDyslexic** for dyslexia
- 5 themes: Dark, Light, High Contrast, Sepia, Low Light
- WCAG-compliant contrast checker
- RTL support (Arabic, Hebrew, Persian)
- 5 languages: English, Spanish, French, German, Russian

---

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Play / Pause | `Space` |
| Speed | `←` `→` |
| Navigate | `↑` `↓` |
| Font size | `Ctrl+←` `Ctrl+→` |
| Add cue point | `M` |
| Jump to cue | `Shift+↑` `Shift+↓` |
| Help | `?` |

<details>
<summary><strong>Gamepad Controls</strong></summary>

| Action | Xbox | PlayStation |
|--------|------|-------------|
| Play/Pause | A | X |
| Reset | B | Circle |
| Speed up | RT (hold) | R2 (hold) |
| Speed down | LT (hold) | L2 (hold) |
| Navigate | D-pad ↑↓ | D-pad ↑↓ |

</details>

---

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|:------:|:----:|:------:|:-------:|
| Teleprompter | Yes | Yes | Yes | Yes |
| Voice-Follow | Yes | Yes | Partial | No |
| Remote Control | Yes | Yes | Yes | Yes |
| Gamepad | Yes | Yes | Yes | Yes |

---

## Privacy & Security

- **100% client-side** — nothing sent to servers
- **No tracking** — no analytics, no cookies
- **No account** — your data stays yours
- **Offline capable** — works without internet after first load
- **Open source** — audit the code yourself

---

## For Developers

### Run Locally

```bash
git clone https://github.com/lifeart/tpt.git
cd tpt
pnpm install
pnpm dev
```

Open [localhost:4205](http://localhost:4205)

### Tech Stack

- **TypeScript** — type-safe, zero runtime dependencies
- **Vite** — fast builds and HMR
- **Tailwind CSS** — utility-first styling
- **Web APIs** — BroadcastChannel, Web Speech, Gamepad, Fullscreen

### Commands

```bash
pnpm build      # Production build
pnpm preview    # Preview production
pnpm test       # Playwright tests
```

---

## Contributing

Found a bug? Have an idea? [Open an issue](https://github.com/lifeart/tpt/issues) or submit a PR.

---

## License

MIT — free for personal and commercial use.

---

## Related Keywords

Free teleprompter, online teleprompter, web teleprompter, teleprompter app, teleprompter for YouTube, teleprompter for streaming, speech prompter, autocue software, free autocue, browser teleprompter, no download teleprompter, voice activated teleprompter, teleprompter with remote control.
