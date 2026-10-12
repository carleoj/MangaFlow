# MangaFlow — Smooth Scrolling

A simple Chrome extension for smooth, adjustable auto-scrolling across the web.

MangaFlow gives you control over how you scroll, with customizable speeds, convenient keyboard shortcuts, and automatic resume functionality. Whether you're reading articles, browsing documentation, reviewing long pages, or exploring any other website, MangaFlow helps make scrolling more effortless.

## Features

- **Adjustable scrolling speed** — Customize the scrolling speed to suit your reading pace.
- **Start, pause, and resume** — Control scrolling whenever you need to.
- **Keyboard shortcuts** — Adjust speed and toggle scrolling without opening the extension popup.
- **Automatic resume** — Resume scrolling after page reloads or navigation on sites where permission has been granted.
- **Per-site permissions** — Request website access when needed instead of requiring access to every website upon installation.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt + S` | Start or pause scrolling |
| `Alt + ↑` | Increase scrolling speed |
| `Alt + ↓` | Decrease scrolling speed |

Shortcuts may be customized through Chrome's extension keyboard shortcut settings.

## Installation

### Install from GitHub Releases

1. Visit the [Releases page](../../releases).
2. Download the latest MangaFlow ZIP package.
3. Extract the ZIP file into a folder.
4. Open `chrome://extensions` in Google Chrome.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted folder containing `manifest.json`.

MangaFlow should now appear in your Chrome extensions list.

**Note:** Manual installation requires Developer mode. This method is intended for users comfortable installing extensions from source.

### Install from Source

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.

After making changes to the extension files, reload the extension and refresh the relevant webpage when necessary.

## Permissions

MangaFlow uses Chrome extension permissions to provide its functionality.

| Permission | Purpose |
| --- | --- |
| `storage` | Store scrolling preferences and settings. |
| `activeTab` | Access the active tab following an eligible user action. |
| `scripting` | Inject extension functionality into authorized pages. |
| Optional host permissions | Request access to supported websites when needed. |

Website access is requested as needed rather than granted to every website during installation.

## Privacy

MangaFlow is designed as a browser-based utility.

- Extension settings may be stored using Chrome's extension storage API.
- Website access is subject to the permissions granted by the user.
- Review the source code to understand how data is handled and whether any external services are used.

## Compatibility

MangaFlow targets Google Chrome and uses Manifest V3 extension APIs.

Scrolling behavior may vary depending on the website's structure, navigation behavior, and scrolling implementation. Restricted browser pages and certain internal Chrome URLs do not permit normal extension script injection.

## Technology

- JavaScript
- HTML
- Chrome Extensions API
- Manifest V3

No build process is required if the repository contains the complete, directly loadable extension source.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Test your changes in Chrome.
4. Submit a pull request with a clear description of the changes and testing performed.

When reporting bugs, include reproduction steps, the affected website, and the expected and actual behavior.

## License
MIT
