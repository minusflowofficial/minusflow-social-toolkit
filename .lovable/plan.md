

# YouTube Transcript Extractor — Full Rebuild Plan

## Important Constraint
This project runs on **React + Vite + Tailwind**, not Next.js. All "API routes" will use the existing `get-transcript` Supabase Edge Function. The `youtube-transcript` npm package won't work client-side, so we keep the current edge function approach.

## Current State
- Edge function `get-transcript` exists but has issues with YouTube blocking caption fetches from server environments
- Basic `TranscriptGenerator.tsx` page exists at `/transcript`
- No bulk, history, or export features

## Plan

### Step 1: Fix the Edge Function
The current `get-transcript` function fails because YouTube blocks caption URL fetches from server IPs. Fix by:
- Adding more realistic browser headers (cookies consent, accept headers)
- Using the `&fmt=json3` endpoint with additional parameters (`&xorb=2&xobt=3&xovt=3`)
- Adding a fallback: if `json3` fails, fetch the XML format and parse it manually

### Step 2: Rebuild Transcript Page (`/transcript`)
Complete redesign with all requested features:
- **Hero section** with large input, auto-paste detection, video thumbnail preview via `img.youtube.com`, title via YouTube oEmbed API
- **Results layout**: sidebar (video info, stats, export buttons) + main transcript area
- **Transcript controls**: search/filter, show timestamps toggle, paragraph mode toggle
- **Per-line features**: clickable timestamps → YouTube, copy icon per line, hover highlight
- **Export**: `.txt`, `.srt`, `.json` download buttons
- **Copy All** button

### Step 3: Add Bulk Extract Page (`/bulk`)
New page at `/bulk`:
- Textarea for up to 50 URLs (one per line)
- Sequential processing with progress bar
- Accordion results — each video card shows title, status, transcript preview, download buttons
- "Download All as ZIP" using existing `jszip` dependency
- Rate limiting: 1-second delay between requests

### Step 4: Add History Page (`/history`)
New page at `/history`:
- localStorage key `yt_transcript_history` (max 50 items)
- Grid of cards: thumbnail, title, date, word count
- View (navigate to transcript) + Delete buttons
- Clear All History button
- Empty state message
- Auto-save on every successful fetch

### Step 5: Update Navigation
Add "Bulk" and "History" links to the Downloaders dropdown in Header.

### Step 6: Styling & Polish
- Dark theme matching existing site (#0f0f0f bg, #1a1a1a cards)
- YouTube red #FF0000 accent (already used)
- Skeleton loaders, toast notifications for copy/download
- Mobile responsive: stacked layout, full-width buttons
- Framer Motion animations consistent with other pages

### Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/functions/get-transcript/index.ts` | Fix caption fetching |
| `src/pages/TranscriptGenerator.tsx` | Full rebuild with sidebar layout, exports, search |
| `src/pages/BulkTranscript.tsx` | New bulk extract page |
| `src/pages/TranscriptHistory.tsx` | New history page |
| `src/lib/transcript-utils.ts` | Shared utilities (formatTime, exportSRT, exportTXT, history helpers) |
| `src/App.tsx` | Add `/bulk` and `/history` routes |
| `src/components/Header.tsx` | Add nav links |

