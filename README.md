# Interactive JavaScript Roadmap 🚀

A comprehensive, interactive web application designed to help you master JavaScript from basic syntax to advanced architecture and production-grade tooling. Unlike static roadmaps, this application is a full productivity learning tracker.

## ✨ Features

This application goes beyond a simple checklist, offering a complete study environment:

- **💾 Local Storage Persistence**: All your progress, notes, badges, and settings are automatically saved in your browser. You'll never lose your progress when you refresh.
- **📥📤 Export & Import**: Backup your learning journey! Download your progress as a JSON file and upload it on any other device to pick up right where you left off.
- **🍅 Pomodoro Focus Timer**: Built-in 25/5 focus timer with audio notifications. Tracks your study sessions to keep you productive and avoid burnout.
- **📝 Personal Notes**: Keep study notes, code snippets, or important links attached directly to specific topics.
- **📊 Study Stats Dashboard**: Track your total completion, current study streak (🔥), daily completions, and view a visual breakdown of your progress across all 15 phases.
- **⭐ Focus Phase**: Pin a specific phase to the top of the roadmap to keep it always in focus.
- **🟢🟡🔴 Difficulty Tags**: Mark topics as Easy, Medium, or Hard to customize your review process and focus on what matters most.
- **🔍 Advanced Filtering & Search**: Quickly find any topic, or filter the roadmap to show only "Todo" or "Done" items.
- **🌗 Dark / Light Mode**: Beautiful UI that looks great in both dark and light modes, with smooth animations and transitions.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom CSS
- **State Management & Persistence**: React Hooks + `localStorage` API

## 🚀 Getting Started

Follow these steps to run the application locally on your machine:

1. **Clone the repository** (if applicable) or download the source code.
2. **Navigate to the project directory**:
   ```bash
   cd javascript-roadmap
   ```
3. **Install dependencies**. You can use `npm`, `yarn`, or `pnpm` (pnpm recommended):
   ```bash
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```
4. **Run the development server**:
   ```bash
   pnpm run dev
   # or
   npm run dev
   # or
   yarn dev
   ```
5. **Open the browser**: Navigate to [http://localhost:3000](http://localhost:3000) to see your interactive roadmap!

## 💡 How to Use the App

- **Expand a Phase**: Click on any of the 15 phase headers to see sections and topics.
- **Complete a Topic**: Click the square checkbox icon next to a topic.
- **Add Notes**: Click the 📝 icon to open the note editor for a topic.
- **Change Difficulty**: Click the circle icon (⚪/🟢/🟡/🔴) to cycle between difficulty states.
- **Focus a Phase**: Click the ⭐ icon on a phase header to pin it to the top.
- **Start Timer**: Click the 🍅 Timer button in the top right corner to open the Pomodoro panel.
- **View Stats**: Click the stats panel showing your progress (e.g., `0/639`) to expand a detailed view.

## 🗂️ Project Structure

- `app/components/JavaScriptRoadmap.tsx`: The main interactive UI combining all features.
- `app/data/roadmap.ts`: The complete structured learning data for all 15 phases of JavaScript.
- `app/hooks/useLocalStorage.ts`: Custom hook for SSR-safe data persistence.
- `app/hooks/usePomodoro.ts`: Custom hook managing the focus timer and audio.

---
*Happy Learning! Master JavaScript one topic at a time.*
