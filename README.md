📺 HLS Multi-Program Bitrate Monitor

A modern web application to analyze, monitor, and test HLS streams with multi-program + multi-variant support.

🚀 Overview

The HLS Multi-Program Bitrate Monitor is a fast, compact web application designed to inspect and monitor HLS .m3u8 playlists.
It supports:

✔ Multi-program M3U lists
✔ Adaptive bitrate (ABR) HLS streams
✔ Real-time segment bitrate analysis
✔ Resolution & bandwidth switching
✔ Detailed QoE metrics (buffering, latency, dropped frames, stalls)
✔ Program & Variant selection with Select2 UI
✔ URL history manager
✔ Theme Switcher (Dark / Light)
✔ Compact mobile-first UI
✔ Fully installable PWA App

Built with Vanilla JS + Hls.js + Select2 and fully optimized for desktop & mobile without scrolling.

✨ Features
🔍 Playlist Parsing

Detects Master HLS playlists

Detects Single-bitrate HLS streams

Detects Multi-Channel M3U lists

Automatically extracts Programs & Variants

🎥 Playback & Analysis

Real-time bitrate calculation (accurate segment-based HEAD analysis)

Live resolution detection

Average bitrate over time

Segment count

Live buffer size

Dropped frames

Playback time

Auto ABR or manual variant selection

Works even with multi-program streams

📱 Mobile Friendly + Compact Layout

No vertical scrolling needed

Program/Variant fields stay visible

Buttons & inputs optimized for touchscreen

🎨 Modern UI

Select2 enhanced dropdowns

Vibrant colors

Theme switcher

Fully customizable via style.css

💾 URL History

Saves last 10 used URLs

Quick dropdown to select recent inputs

Clear history & reset app button

📦 PWA (Progressive Web App)

Installable on Android, Desktop, Chrome, Edge, Firefox

Works offline after installation

Responsive app icon (192×192)

manifest.json + service-worker.js included

📱 Install as PWA

After loading the app:

Click Install App (browser prompt)

Or open browser menu → Install

App will install with its own icon & window

Works offline after first load

📂 Project Structure
/
│── index.html
│── style.css
│── script.js
│── manifest.json
│── service-worker.js
│── icons/
│     ├── 192x192.png
│     └── 512x512.png
└── README.md

🔧 Technologies Used

JavaScript (Vanilla)

Hls.js

Select2

HTML5 Video

CSS3 / Custom Themes

PWA APIs

LocalStorage

🎯 Roadmap (Future Features)

Thumbnail preview of segments

Save & export logs

WebRTC test mode

Offline local playlist testing

Additional QoE metrics

Multi-window monitoring layout

🤝 Contributing

Pull requests are welcome!
For major changes, please open an issue first to discuss what you would like to add or modify.