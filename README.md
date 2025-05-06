# Okapi - Gamified Process Improvement Companion

Okapi is a web application designed to help you track and improve processes in a gamified way. Create "Spaces" to represent areas you want to work on, track your time, log actions, identify waste, and visualize your progress.

## Key Features

*   **Space Management:**
    *   Create distinct "Spaces" to represent different projects, workflows, or areas for improvement.
    *   Define specific goals for each Space.
    *   Add optional "Before" and "After" images to visualize transformations.
    *   Duplicate existing Spaces to quickly set up similar tracking areas.
    *   Delete Spaces when they are no longer needed.
*   **Time Tracking:**
    *   Clock In/Out for each Space to track dedicated time spent.
    *   View current session duration and total cumulative time spent in a Space.
*   **Action Tracking:**
    *   Define **Simple Actions** with associated point values.
    *   Log completions of Simple Actions, applying multipliers (x1, x2, x5, x10) for repeated tasks.
    *   Define **Multi-Step Actions** (Quests) with sequential steps, each awarding points upon completion.
    *   Track progress through Multi-Step Actions.
*   **Waste Tracking (TIMWOODS):**
    *   Identify and log instances of waste based on the 8 TIMWOODS categories (Transportation, Inventory, Motion, Waiting, Overprocessing, Overproduction, Defects, Skills).
    *   Track accumulated "Waste Points".
*   **Logging & Comments:**
    *   View a detailed log of all actions, clock events, and waste entries.
    *   Add comments to a Space, optionally attaching images captured via upload or device camera.
*   **Task / Gallery:**
    *   Create visual task items or gallery entries.
    *   Add "Before" images (via upload or camera).
    *   Mark tasks as complete and add optional "After" images (via upload or camera).
*   **Dashboard:**
    *   View key metrics at a glance for each Space: Session Time, Total Time, Action Points (AP), Average AP per Hour (current session), and Waste Points.
*   **Persistence & Offline Support:**
    *   All data (Spaces, Actions, Logs, etc.) is stored locally in your browser using **IndexedDB**.
    *   Basic offline support is enabled via a **Service Worker**, allowing the app to load and function without an internet connection after the initial visit.
*   **Mobile-Friendly:** Designed with a responsive layout for use on various screen sizes.

## Technology Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** ShadCN UI, Lucide Icons
*   **State Management:** React Context API
*   **Local Storage:** IndexedDB
*   **Offline Support:** Workbox (Service Worker)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
4.  Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser.

## AI-Assisted Development

This application was developed with significant assistance from AI tools. AI played a major role in generating code snippets, suggesting architectural patterns, debugging errors, and refining the user interface based on iterative prompts.

## Open Source

Given the AI-assisted nature of its development and to encourage collaboration and learning, Okapi is intended to be open source. Please consider adding an appropriate open-source license (e.g., MIT License) to the project.

```javascript
// Example: Add MIT License section
/*
## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
*/
```

*(You would need to create a `LICENSE.md` file with the actual MIT License text).*