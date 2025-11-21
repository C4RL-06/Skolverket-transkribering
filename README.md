# TrustScribe

TrustScribe is a locally hosted transcription tool built with Python, PyWebView, and Hugging Face Whisper models. It lets you drag-and-drop audio/video, pick a Swedish or English model size, and generate diarized transcripts without sending files to the cloud.

## Highlights
- Offline-first: models are downloaded once and stored under `cache/`.
- Queue-based processing with progress tracking for multiple files.
- Modern UI for browsing/editing saved transcripts and managing cached models.

## Getting Started
1. Install Python 3.10+ and ffmpeg (see `requirements.txt` for detailed notes).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the desktop app:
   ```bash
   python main.py
   ```
4. Use the **Ny transkribering** button to add files and start transcribing. Saved transcripts live in `Documents/TrustScribe`.

## Model Management
Open the settings modal (gear icon) to see which Whisper models are downloaded. You can delete unused models there to reclaim disk space; they’ll download again automatically when needed.

---
Built for teams that need trustworthy, local speech-to-text when handling sensitive recordings.

