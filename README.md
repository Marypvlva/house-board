# House Callboard

A tiny, dependency-free announcement board that works as a static site on GitHub Pages. Residents can add announcements locally (saved in their browser). Maintainers can export and publish a shared `announcements.json` file to the repository for everyone to see.

## Quick start

1. Create a new GitHub repository and add these files:
   - `index.html`
   - `style.css`
   - `app.js`
   - Optional: `announcements.json` (sample provided)

2. Enable GitHub Pages:
   - Go to your repo → Settings → Pages.
   - Build and deployment: Source → Deploy from a branch.
   - Branch: `main` and folder `/ (root)`.
   - Save. After a minute, your site will be live at `https://<user>.github.io/<repo>/`.

3. Visit the site. It will:
   - Load shared posts from `./announcements.json` if present.
   - Merge with any posts saved in your browser’s localStorage.
   - Show pinned posts first, then newest by date.

## Posting

- Local mode (default):
  - Fill the form and click “Add locally”. The post appears immediately but is visible only on that device/browser (saved in localStorage).
  - No cookies, no analytics; only localStorage is used.

- Repo mode (shared):
  - Click “Export announcements.json”.
    - A file will download and the JSON is copied to your clipboard.
  - Commit `announcements.json` to the repository root (or edit the file on GitHub and paste the JSON).
  - Refresh the site. It will fetch and show the shared posts.
  - Merge strategy: posts are deduplicated by `id`. If a post with the same `id` exists both locally and in the repo file, the repo version takes precedence.

## File format

`announcements.json` is an array of posts:

```json
[
  {
    "id": "2025-08-10-water-shutoff",
    "title": "Water shut-off (Aug 25, 10:00–14:00)",
    "body": "Repairs in the main line. Please store water in advance.",
    "date": "2025-08-10",
    "expires": "2025-08-26",
    "tags": ["utilities"],
    "pinned": true
  }
]
```

Fields:
- id (string, unique)
- title (string)
- body (string, supports basic markdown: bold, italic, links)
- date (ISO `YYYY-MM-DD`)
- expires (optional ISO date). Hidden after this day unless “Show expired” is on.
- tags (optional string array)
- pinned (optional boolean)

Ordering: pinned first, then by `date` descending.

## Tips

- Per-post link: click the 🔗 icon to use an anchor link (e.g., `#2025-08-10-water-shutoff`).
- Markdown: supports `**bold**`, `*italic*`, `[text](https://url)`, and newlines.
- Printing: use the browser’s Print dialog to get a clean board for physical posting.

## Customization

- Change site title:
  - Edit `<title>` in `index.html` and the `<h1 class="site-title">`.
- Colors:
  - Adjust CSS variables at the top of `style.css`. Dark mode uses `prefers-color-scheme`.
- Default dates:
  - The form’s date defaults to today based on your time zone.

## Troubleshooting

- If `announcements.json` is missing or invalid, the site stays in local mode and shows a non-blocking message.
- If nothing shows:
  - Clear filters, enable “Show expired,” or add a local post.
- Local posts live only in your browser. Clearing site data or using another device will not show them until they’re exported and shared.

## Development

- No build tools or external CDNs. Pure HTML/CSS/JS.
- Works entirely as a static site on GitHub Pages.
- Tested in modern browsers.

## License

MIT — see `LICENSE`.
