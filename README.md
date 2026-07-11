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

### 2. Strip tracking parameters

When you paste a Markdown link, the plugin removes a broad list of known tracking parameters — `utm_*` and other `utm_`-style families, ad and click IDs (`gclid`, `fbclid`, `igshid`, `msclkid`, …), affiliate tags, email-campaign IDs, and more — while keeping the link text and any genuine query parameters. The list is case-insensitive and also matches by prefix, so a brand-new `utm_something` is caught too.

Tracking data hidden in the `#fragment` is cleaned intelligently: real anchors (`#body`, `#section`) and single-page-app routes (`#/path`) are preserved, and only fragments that are actually encoded tracking data are removed.

Paste this:
```
[Rubber Band Powered Cup Launcher | KiwiCo](https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher?utm_content=sub&utm_campaign=NP-EOTW&utm_source=blast#body)
```
Get this:
```
[Rubber Band Powered Cup Launcher | KiwiCo](https://www.kiwico.com/diy/stem/motion-mechanics/rubber-band-powered-cup-launcher#body)
```
(The `#body` anchor is now kept, because it is a real anchor rather than tracking data.)

The broader list includes some aggressive generic names (`ref`, `tag`, `source`, `campaign`, …). These clean far more, but can occasionally strip a legitimate parameter such as a blog's `?tag=` or a site's `?q=` search. Rather than turning the whole rule off, you can add that site to the **Tracking-parameter exceptions** list (one domain per line or comma-separated) to leave its links untouched. Subdomains are included automatically, so `example.com` also covers `www.example.com`.

### 3. Clean Amazon product links

When you paste a Markdown link to an Amazon product page, the plugin shortens it to its canonical `…/dp/<ASIN>` (or `…/gp/product/<ASIN>`) form, dropping the `/ref=…` code, query, and fragment.

Paste this:
```
[Strange Houses : Uketsu : Amazon.ca: Books](https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X/ref=asc_df_006343315X?mcid=0377&tag=googleshopc0c-20)
```
Get this:
```
[Strange Houses : Uketsu : Amazon.ca: Books](https://www.amazon.ca/Strange-Houses-Novel-Uketsu/dp/006343315X)
```

### 4. Strip notification counts

Many social and messaging sites prefix a browser tab title with a notification/badge count, so a copied link title ends up looking like `(14) Home / X`. When you paste a Markdown link, the plugin removes that count from the title while leaving the URL alone.

The count can be at the start of the title, or embedded as a standalone piece (as Gmail does). Only short counts — up to 3 digits, with an optional trailing `+` — are removed, so a legitimate number like a year in `Blade Runner (2049)` is kept.

Paste this:
```
[(14) Home / X](https://x.com/home)
```
Get this:
```
[Home / X](https://x.com/home)
```

Or paste this:
```
[Inbox (47) - quietbyday@gmail.com - Gmail](https://mail.google.com/mail/u/0/#inbox)
```
Get this:
```
[Inbox - quietbyday@gmail.com - Gmail](https://mail.google.com/mail/u/0/#inbox)
```

Because a bare `(N)` could occasionally be a real part of a title, this rule only runs on domains in the **Notification-count domains** whitelist (one per line or comma-separated). It ships with `x.com`, `facebook.com`, `youtube.com`, and `google.com`; add your own, and remove any you don't want. Subdomains are included automatically, so `google.com` also covers `mail.google.com`. If the list is empty, no counts are stripped.

### Also clean bare URLs (optional)

By default, the tracking and Amazon cleaners only act on Markdown links (`[text](url)`). Turn on **Also clean bare URLs** to have them clean plain pasted URLs too — the result stays a bare URL.

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

### 0.3.2 (beta)
- Added **Strip notification counts**: removes a notification/badge count like `(14)` or `(20+)` from a pasted Markdown link title (e.g. `[(14) Home / X]` → `[Home / X]`, `[Inbox (47) - Gmail]` → `[Inbox - Gmail]`). Handles a count at the start of the title or a standalone one embedded mid-title, strips only the first count, and keeps 4-digit numbers like a year (`(2049)`). On by default; toggle in settings.
- Added a **Notification-count domains** whitelist for that rule (pre-filled with `x.com`, `facebook.com`, `youtube.com`, `google.com`) — counts are only stripped on listed domains, and an empty list strips nowhere.
- Added a **Tracking-parameter exceptions** list — domains to leave untouched by the tracking-parameter cleaner, for sites where a query is a real search or reference rather than a tracker. Both lists are subdomain-inclusive.

### 0.3.1 (beta)
- Fixed a bug where a converted paste (e.g. a YouTube timestamp link) could be inserted twice, producing a doubled link, when Obsidian dispatched the paste event more than once

### 0.3.0 (beta)
- Replaced the UTM-only cleaner with a much broader **tracking-parameter** engine, built from a merged list of ~120 known trackers (synthesised from the *Eraser* and *clean-url* extensions), with case-insensitive and prefix matching
- Added **smart fragment handling**: real anchors (`#body`, `#section`) and SPA routes (`#/path`) are now preserved, and only encoded tracking data in the fragment is removed
- Amazon cleaning is now **canonicalisation** — links are shortened to `…/dp/<ASIN>` rather than just cutting at `/ref=`
- Notifications now report how many tracking parameters were removed
- Renamed the settings toggles (**Strip tracking parameters**, **Clean Amazon product links**); existing settings are migrated automatically

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
