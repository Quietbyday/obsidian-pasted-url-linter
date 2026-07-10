# Pasted URL Linter

An [Obsidian](https://obsidian.md) plugin that cleans up and formats URLs as you paste them into your notes. It started as a YouTube-timestamp formatter and is growing into a general URL linter.

## Usage

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

## How to Install (Beta)

1. Install the **BRAT** plugin from the Obsidian Community Plugins store.
2. Go to **Settings → Community plugins → BRAT** .
3. Click **Add Beta plugin**.
4. Paste the following repository URL: `https://github.com/Quietbyday/obsidian-pasted-url-linter`
5. Click **Add Plugin**. 
6. Enable **"Pasted URL Linter"** in Community plugins.

To update to the latest beta version, go to BRAT and click **Check for updates** (or restart Obsidian).

## Author

[Quietbday](https://github.com/quietbyday)

## Changelog

### 0.1.0 (beta)
- Initial release
- Automatically converts pasted YouTube timestamp URLs into Markdown links
- Supports `youtu.be` short links, `youtube.com` full links, and `m.youtube.com` mobile links
- Timestamp displayed in `m:ss` format (e.g. `1:55`) or `h:mm:ss` for videos over an hour
