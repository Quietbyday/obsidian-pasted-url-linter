# Paste YouTube Timestamp

An [Obsidian](https://obsidian.md) plugin that automatically converts pasted YouTube timestamp links into clean, readable Markdown links.

## What it does

When you paste a YouTube URL that includes a timestamp, the plugin replaces the raw URL with a Markdown link. The link text shows the timestamp in a human-readable format, while the URL remains intact so the link still takes you directly to that point in the video.

**Example:**

Paste this:
```
https://youtu.be/49V-5Ock8LU?t=115
```

Get this in your note:
```
[1:55](https://youtu.be/49V-5Ock8LU?t=115)
```

Regular pastes are not affected — the plugin only activates when it detects a YouTube URL with a timestamp parameter.

## Use case

You're watching a YouTube video and want to take timestamped notes in Obsidian. In your browser, right-click the video and select **Copy video URL at current time**. Paste that link into your note and the plugin instantly formats it as a readable timestamp link — so your notes stay clean and every timestamp is one click away from the exact moment in the video.

## Supported URL formats

The plugin recognises timestamp links from all standard YouTube URL formats:

- `https://youtu.be/...?t=<seconds>` — short links (e.g. from the Share button)
- `https://www.youtube.com/watch?v=...&t=<seconds>` — full links
- `https://m.youtube.com/watch?v=...&t=<seconds>` — mobile links

## Installation

1. Download `main.js` and `manifest.json` from the [latest release](../../releases/latest).
2. Create a folder called `paste-youtube-timestamp` inside `<Your Vault>/.obsidian/plugins/`.
3. Copy both files into that folder.
4. In Obsidian, go to **Settings → Community plugins**, reload the plugin list, and enable **Paste YouTube Timestamp**.

## Building from source

```bash
npm install
npm run build
```

This requires Node.js and produces `main.js` at the project root.

## Author

[Quietbday](https://github.com/quietbyday)

## Changelog

### 0.1.0 (beta)
- Initial release
- Automatically converts pasted YouTube timestamp URLs into Markdown links
- Supports `youtu.be` short links, `youtube.com` full links, and `m.youtube.com` mobile links
- Timestamp displayed in `m:ss` format (e.g. `1:55`) or `h:mm:ss` for videos over an hour
