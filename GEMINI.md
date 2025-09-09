# Project Overview: ql-tc-vite

This is a `ql-tc-vite` project, a personal money management application built with **React**, **TypeScript**, and **Vite**.

## Key Features and Technologies:

*   **AI Query Capabilities:** Integrates with **Google Generative AI** to provide intelligent insights and responses to user queries related to financial transactions. Relevant files: [`src/pages/AiQueryPage.jsx`](src/pages/AiQueryPage.jsx), [`src/utils/prompts.js`](src/utils/prompts.js).
*   **Data Management:** Utilizes **Dexie** for local data storage (IndexedDB) and **Firebase** for backend services, offering flexible data handling. Relevant files: [`src/services/db.js`](src/services/db.js), [`src/services/firebase.js`](src/services/firebase.js).
*   **Data Visualization:** Employs **Chart.js** and `react-chartjs-2` for interactive and informative data visualization of financial trends. Example usage: [`src/pages/DashboardPage.jsx`](src/pages/DashboardPage.jsx).
*   **User Interface:** Built with **React** for a dynamic and responsive user experience, styled using **Tailwind CSS** for a utility-first approach to styling. Key files: [`src/App.jsx`](src/App.jsx), [`src/index.css`](src/index.css), [`tailwind.config.js`](tailwind.config.js).
*   **Routing:** Manages navigation within the application using **React Router DOM**. Configured in: [`src/Router.jsx`](src/Router.jsx).
*   **Progressive Web App (PWA):** Configured with `vite-plugin-pwa` to provide an installable, offline-first experience. Configuration and assets: [`vite.config.js`](vite.config.js), [`public/manifest.json`](public/manifest.json).
*   **Markdown Rendering:** Uses `react-markdown` to display AI-generated responses, which are likely formatted in Markdown. Example usage: [`src/pages/AiQueryPage.jsx`](src/pages/AiQueryPage.jsx).

## Building and Running:

This project uses `npm` (or `yarn`) for package management.

*   **Install Dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

*   **Start Development Server:**
    Runs the application in development mode with hot-reloading.
    ```bash
    npm run dev
    # or yarn dev
    ```

*   **Build for Production:**
    Compiles TypeScript and builds the application for production deployment.
    ```bash
    npm run build
    # or yarn build
    ```

*   **Run Linter:**
    Checks code for style and quality issues using ESLint.
    ```bash
    npm run lint
    # or yarn lint
    ```

*   **Preview Production Build:**
    Serves the production build locally for testing.
    ```bash
    npm run preview
    # or yarn preview
    ```

## Development Conventions:

*   **Language:** TypeScript is used for type safety and improved code maintainability.
*   **Styling:** Tailwind CSS is the primary framework for styling, promoting consistent and rapid UI development.
*   **Code Quality:** ESLint is configured to enforce code style and identify potential issues.
*   **Build Tool:** Vite is used for its fast development server and optimized build process.