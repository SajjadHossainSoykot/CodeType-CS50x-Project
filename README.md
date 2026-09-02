# CodeType: Programming Typing Practice Web App
#### Video Demo: https://youtu.be/vx2EkBozT_M

#### Description:

CodeType is a web application built as a CS50x 2026 final project that helps programmers practice typing real code. Traditional typing practice websites focus on ordinary prose—sentences and paragraphs of natural language—but programmers spend their time typing something fundamentally different: brackets, semicolons, indentation, operators, keywords, and structured syntax. CodeType addresses this gap by presenting actual code snippets from five popular programming languages and measuring the user's typing speed, accuracy, and mistake count as they reproduce each snippet character by character.

#### Repository: https://github.com/SajjadHossainSoykot/CodeType-CS50x-Project
#### Live Demo: https://codetype-cs50x.vercel.app/

## Features

Users select a programming language (C, Python, SQL, HTML, or JavaScript) and difficulty level (Easy, Medium, or Hard), then click **Start Practice** to load a random code snippet. The typing test page displays the target code in a monospace font with real-time character highlighting—green for correct, red for incorrect, and a blinking cursor at the current position. A live HUD shows elapsed time, WPM, accuracy, and mistakes.

The timer begins only when the user starts typing. The Tab key inserts four spaces for proper indentation, and copy-paste is disabled. When the typed text exactly matches the target snippet, the test finishes automatically, displaying a result panel with final statistics. Results are saved to the database, and buttons allow retrying, starting a new test, or viewing history.

The History page shows summary statistics (total tests, best WPM, average WPM, average accuracy), a per-language breakdown, and recent attempts ordered newest first. A **Clear History** button with confirmation allows deleting all records.

## Technologies

**Python/Flask** serves as the backend—lightweight and well-suited to the small number of routes needed. **SQLite** stores typing-test attempts using Python's built-in `sqlite3` module, requiring no external database. **HTML/Jinja2** templates generate pages server-side. **Bootstrap 5** provides responsive layout components, dark theme styling, cards, tables, and badges. **Vanilla JavaScript** powers the real-time typing engine. **JSON** stores the static snippet library separately from user-generated data.

## Files

- **app.py** — The Flask application. Contains database initialization, snippet loading, server-side validation, and all five routes (home, test, API save, history, clear history).
- **schema.sql** — Defines the `attempts` table schema. Used to automatically create the database and table schema when needed.
- **snippets.json** — A JSON file containing 90 code snippets organized by language and difficulty. Each snippet has a unique ID and a `code` string preserving exact whitespace, indentation, and special characters.
- **templates/layout.html** — The base Jinja2 template providing the navigation bar, flash message area, content block, footer, and font imports.
- **templates/index.html** — The home page template with the hero section, interactive language and difficulty selectors, and the Start Practice button.
- **templates/test.html** — The typing test page. Embeds the snippet data as a JSON script element using Jinja's `tojson` filter for safe transmission to JavaScript.
- **templates/history.html** — The history page displaying summary cards, per-language statistics table, recent attempts table, and the clear history form.
- **static/styles.css** —Custom styling for the typing engine, including correct, incorrect, and current character states, newline indicators, cursor effects, and the hidden typing input. Bootstrap handles most of the overall responsive layout and dark interface.
- **static/test.js** — The client-side typing engine. Handles snippet rendering, input tracking, timer management, WPM/accuracy calculations, test completion detection, result saving via fetch, and restart functionality.

## Database

The application uses a single SQLite table called `attempts`. Each row stores one completed typing test: the snippet ID, programming language, difficulty, WPM, accuracy, error count, duration in seconds, and a timestamp. All SQL queries use parameterized placeholders to prevent injection. Aggregate queries using `COUNT`, `MAX`, `AVG`, and `GROUP BY` power the history page statistics.

Snippets are stored in `snippets.json` rather than SQLite because they are static application content that ships with the project. Attempts are stored in SQLite because they are dynamic, user-generated data that accumulates over time. This separation reflects a deliberate design choice about where different kinds of data belong.

## Typing Algorithm

The timer starts when the user types the first character and updates every 100 milliseconds. Each character entered contributes to the character-entry counter. Printable characters and newlines count individually, while pressing Tab inserts and counts four spaces. When a character is typed, it is compared against the expected character at that position in the target snippet; if it does not match, the mistake counter increments. Pressing Backspace does not decrement the mistake counter—mistakes, once made, are permanent in the statistics even if corrected. Live WPM is calculated as `(typed_character_count / 5) / elapsed_minutes`, using the standard five-characters-per-word convention (which equals target snippet length upon test completion). Accuracy is `((total_keystrokes - mistakes) / total_keystrokes) * 100`, clamped between 0 and 100. The test completes automatically when the textarea value exactly equals the target snippet string.

## Design Decisions

- **Flask over a frontend framework**: Server-rendered pages with minimal JavaScript keep the project understandable. React or Next.js would add unnecessary complexity.
- **SQLite for persistence**: No external database server required. The SQLite database and schema are initialized automatically when the database file is first created.
- **JSON for snippets**: Snippets are static read-only content, best kept in a version-controllable flat file.
- **No user accounts**: Authentication would add complexity without improving the core typing-practice experience.
- **Completion requires matching**: The test only finishes when typed text exactly matches the target, ensuring WPM reflects the full snippet.

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000` in a web browser.

## Usage

1. Select a programming language and difficulty on the home page.
2. Click **Start Practice** to load a random snippet.
3. Type the displayed code as quickly and accurately as possible.
4. Review your results and optionally retry or start a new test.
5. Visit **History** to track performance over time.

## Limitations

- Local single-user history with no cloud sync.
- No online leaderboard or multiplayer.
- Snippet library is bundled and cannot be expanded through the UI.
- WPM uses the five-characters-per-word approximation.

## Future Improvements

- User profiles and authentication.
- Online leaderboards.
- More programming languages.
- Custom snippet creation.
- Per-key statistics and keyboard heatmaps.
- Performance charts.

## Acknowledgements
Google Antigravity was used to assist with portions of the project's implementation. AI-assisted code was reviewed and modified by the developer.