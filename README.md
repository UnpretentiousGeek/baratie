# Baratie 👨‍🍳

Baratie is an AI-powered recipe manager that transforms how you cook. It extracts recipes from various sources and converts them into an interactive, step-by-step cooking guide.

![Baratie Icon](/public/assets/Icon.png)

## ✨ Features

-   **AI Recipe Extraction**: Instantly extract recipes from:
    -   Text (paste any recipe text)
    -   URLs (websites, blogs)
    -   YouTube Videos (extracts from captions/description)
    -   Images (upload photos of cookbooks or handwritten notes)
-   **Interactive Cooking Mode**: Step-by-step guidance that keeps track of your progress.
-   **Smart Timer**: Built-in timer that runs in the background and persists across refreshes.
-   **AI Chef Assistant**: Chat with the AI to ask questions about substitutions, techniques, or nutrition while you cook.
-   **Data Persistence**: Your current recipe, chat history, and timer state are saved automatically, so you never lose your place.
-   **PDF Export**: Download your recipes as beautifully formatted PDFs.

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: CSS (with Tailwind directives), Framer Motion for animations
-   **AI**: Google Gemini API
-   **Routing**: React Router
-   **Icons**: Lucide React

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/baratie.git
    cd baratie
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your API keys:
    ```env
    VITE_GEMINI_API_ENDPOINT=your_api_endpoint
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 📝 Credits

This project was designed and developed by **Sanchit Tomar**.
-   **Design**: Figma
-   **Development**: Vibe coding with Cursor and Claude Code

## 📄 License

MIT
