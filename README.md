# 📺 HLS Multi-Program Bitrate Monitor

A modern web application to **analyze, monitor, and test HLS streams** with full support for multi-program + multi-variant HLS playlists—optimized for both desktop and mobile.

---

## 🚀 Overview

The **HLS Multi-Program Bitrate Monitor** is a fast, compact, browser-based tool built to inspect `.m3u8` playlists and monitor real-time streaming metrics.

It supports:

✔ Multi-program M3U channel lists  
✔ Adaptive bitrate (ABR) HLS streams  
✔ Real-time segment bitrate analysis  
✔ Resolution & bandwidth switching  
✔ Detailed QoE metrics (latency, stalls, buffers, dropped frames)  
✔ Program & Variant selection (Select2 UI)  
✔ URL History manager  
✔ Responsive Light/Dark theme  
✔ Ultra-compact mobile layout (no scrolling)  
✔ Fully installable **PWA Application**

Built with **Vanilla JS + Hls.js + Select2**, ensuring speed, simplicity, and maximum compatibility.

---

## ✨ Features

### 🔍 Playlist Parsing

- Detects HLS master playlists  
- Detects single-bitrate media playlists  
- Detects multi-channel M3U lists  
- Automatically extracts programs and variants  

---

### 🎥 Playback & Stream Analysis

- **Accurate bitrate measurement** using HEAD requests  
- **Current segment bitrate** (Kbps)  
- **Average bitrate** over playback duration  
- **Live resolution detection**  
- **Segment count**  
- **Live buffer duration**  
- **Dropped video frames**  
- **Playback time counter**  
- **Auto ABR mode**  
- Manual variant selection with metadata:
  - Resolution  
  - Codec  
  - Bitrate  

---

### 📱 Mobile-Friendly + Compact Layout

- Zero vertical scrolling  
- Smart adaptive layout  
- Wide Select2 dropdowns  
- Touch-friendly controls  

---

### 🎨 Modern UI

- Select2-enhanced dropdowns  
- Smooth Light/Dark theme toggle  
- Vibrant, modern design  
- Fully customizable via `style.css`  

---

### 💾 URL History Manager

- Stores last **10 URLs**  
- Dropdown for quick selection  
- Clear History option  
- Full App Reset  
- Persistent via LocalStorage  

---

### 📦 Progressive Web App (PWA)

- Installable on:
  - Android  
  - Desktop (Chrome, Edge, Brave)  
  - Firefox Mobile  
- Works offline after installation  
- Includes:
  - `manifest.json`  
  - `service-worker.js`  
  - App icons (192×192, 512×512)

---

## 📸 Screenshots

Located in the `/screenshots/` directory:

### **Screenshot 1**
![Screenshot 1](screenshots/Screenshot-1.png)

### **Screenshot 2**
![Screenshot 2](screenshots/Screenshot-2.png)

### **Screenshot 3**
![Screenshot 3](screenshots/Screenshot-3.png)

### **Screenshot 4**
![Screenshot 4](screenshots/Screenshot-4.png)

---

## 📱 Installing as a PWA

To install:

1. Open the app in Chrome/Edge/Firefox  
2. Click **Install App** when prompted  
3. OR open the browser menu → **Install**  
4. It installs with its own icon + offline support  

---
