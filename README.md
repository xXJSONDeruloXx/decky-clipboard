# Decky Clipboard

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that lets you save and copy custom commands to the clipboard in Steam Deck game mode.

![Screenshot of Decky Clipboard](assets/screenshot.png)

## Features

- Save named clipboard entries with custom commands
- One-tap copy to clipboard
- Optional command appending mode
- Persistent storage via Python backend

## Dev Setup

**Requirements:** Node.js 16.14+, pnpm v9

```bash
pnpm i
pnpm run build
```

Or in VS Code, run the `setup` → `build` → `deploy` tasks.

## Project Structure

```
src/index.tsx    # Frontend React UI
main.py          # Python backend (entry persistence)
```

## License

BSD-3-Clause — see [LICENSE](LICENSE)
