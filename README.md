# 🎮 YouTube Transcript Summarizer Extension

A Chrome extension that extracts YouTube video transcripts and lets you summarize them using **ChatGPT**, **Gemini**, or **Claude**. Seamlessly adds a toggleable sidebar to YouTube with transcript and AI-powered summarization features.

---

## ✨ Features

* 📜 View the full transcript of any YouTube video in a sidebar
* 🗌 Copy the entire transcript with one click
* 🧠 Summarize the transcript using your preferred AI:

  * [ChatGPT](https://chat.openai.com/)
  * [Gemini](https://gemini.google.com/)
  * [Claude](https://claude.ai/)
* ⚙️ Customize your prompt and platform in settings
* 🧲 Easily toggle the sidebar with a button on YouTube

---

## 🚀 How It Works

1. Open any YouTube video with transcripts.
2. Click the **Toggle Sidebar** button in the top-right corner.
3. View and copy the transcript from the sidebar.
4. Choose an AI platform and click “Summarize”.
5. The transcript + prompt is copied to your clipboard and your selected AI opens in a new tab—just paste and go!

*Note: No API keys required.*

---

## 💪 Installation

1. Clone or download this repository:

2. Open Chrome and go to: `chrome://extensions/`

3. Enable **Developer mode** (top-right corner)

4. Click **"Load unpacked"** and select the cloned folder

5. Navigate to any YouTube video and click the toggle button to open the sidebar

---

## 📁 Project Structure

```
youtube-transcript-summarizer/
│
├── manifest.json      # Chrome extension configuration
├── content.js         # Injected script with sidebar UI + logic
├── README.md          # Project documentation
```

---

## 🔐 Permissions

* `activeTab`: To run on the current YouTube tab
* `storage`: To remember your chosen AI and prompt

--

## 🙌 Author

Built by [Harsh-Pachauri](https://github.com/Harsh-Pachauri)

If you find this useful, give it a ⭐ and share!
