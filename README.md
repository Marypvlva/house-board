# House Callboard
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

## License

See `LICENSE`.
