# Pasted URL Linter

An [Obsidian](https://obsidian.md) plugin that cleans up and formats URLs as you paste them into your notes. It started as a YouTube-timestamp formatter and is growing into a general URL linter.

## Features

The plugin watches what you paste and tidies up links automatically. Each rule can be turned on or off in **Settings → Pasted URL Linter** (all are on by default, except *Also clean bare URLs*). Whenever a paste is cleaned, a short notification confirms what happened. Anything the plugin doesn't recognise is pasted normally, untouched.

### 1. Convert YouTube timestamp links

When you paste a YouTube URL that includes a timestamp, the plugin replaces the raw URL with a Markdown link. The link text shows the timestamp in a human-readable format, while the URL remains intact so the link still takes you directly to that point in the video.

Paste this:
```
https://youtu.be/49V-5Ock8LU?t=115
```
Get this:
```
[1:55](https://youtu.be/49V-5Ock8LU?t=115)
```

### 2. Strip UTM tracking parameters

When you paste a Markdown link whose URL carries `utm_*` tracking parameters, the plugin removes them (and any trailing `#fragment`), keeping the link text and any genuine query parameters.

Paste this:
```
[Rubber Band Powered Cup Launcher | KiwiCo](https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher?utm_content=sub&utm_campaign=NP-EOTW&utm_source=blast#body)
```
Get this:
```
[Rubber Band Powered Cup Launcher | KiwiCo](https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher)
```

### 3. Strip Amazon reference codes

When you paste a Markdown link to an Amazon page, the plugin removes the `/ref=…` reference code and everything after it, leaving a clean product link.

Paste this:
```
[Strange Houses : Uketsu : Amazon.ca: Books](https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X/ref=asc_df_006343315X?mcid=0377&tag=googleshopc0c-20)
```
Get this:
```
[Strange Houses : Uketsu : Amazon.ca: Books](https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X)
```

### Also clean bare URLs (optional)

By default, the UTM and Amazon cleaners only act on Markdown links (`[text](url)`). Turn on **Also clean bare URLs** to have them clean plain pasted URLs too — the result stays a bare URL.

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

### 0.2.0 (beta)
- Renamed to **Pasted URL Linter** — broadened from YouTube timestamps into general paste-time URL cleanup
- Added **Strip UTM tracking parameters** for pasted Markdown links (removes `utm_*` params and trailing `#fragment`, keeps other query params)
- Added **Strip Amazon reference codes** for pasted Amazon Markdown links (removes `/ref=…` and everything after)
- Added a **settings screen** with an on/off toggle for each rule
- Added an optional **Also clean bare URLs** toggle (off by default) that extends the UTM/Amazon cleaners to plain pasted URLs
- A brief notification now confirms whenever a paste is cleaned

### 0.1.0 (beta)
- Initial release
- Automatically converts pasted YouTube timestamp URLs into Markdown links
- Supports `youtu.be` short links, `youtube.com` full links, and `m.youtube.com` mobile links
- Timestamp displayed in `m:ss` format (e.g. `1:55`) or `h:mm:ss` for videos over an hour
