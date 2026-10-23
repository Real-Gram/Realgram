# Realgram Gold After Dark browser playground

Buildless HTML/CSS/JavaScript prototype. Serve this directory as static files.
Published review location: https://setai.no/realgram/ (explicit user instruction).

See `../../docs/design/GOLD_AFTER_DARK.md` and `CLAUDE_HANDOFF.md` for the design
contract, assets, native port map and boundaries. The local asset files are
required; there are no CDNs, packages, backend calls or build dependencies.

All data is fictional and page-memory only. Reload or Reset restores examples.
Calls, voice playback/recording, VPN and advertising are visual previews. Profile
edits and messages are not sent to a live account. No new APK is produced here.

Syntax check: `node --check web-preview/realgram/app.js` from repository root.
Review narrow (360/390/430 px) and wide (800/1100 px) layouts, keyboard focus,
all tabs, search/unread filter, message composition, stickers/reaction, profile
editing, modal close/Escape, ads above logs and reduced motion.
