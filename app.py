# AI assistance: ChatGPT was used for project planning, and Google
# Antigravity was used to assist with portions of this implementation.

import json
import os
import random
import sqlite3

from flask import Flask, flash, jsonify, redirect, render_template, request, url_for

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Supported languages and difficulties
LANGUAGES = ["C", "Python", "SQL", "HTML", "JavaScript"]
DIFFICULTIES = ["easy", "medium", "hard"]

# Absolute base directory for file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# On Vercel (or serverless environments), use /tmp for writable SQLite database
if os.environ.get("VERCEL"):
    DATABASE = "/tmp/codetype.db"
else:
    DATABASE = os.path.join(BASE_DIR, "codetype.db")


def get_db_connection():
    """Open a connection to the SQLite database and ensure tables exist."""
    db_exists = os.path.exists(DATABASE)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    if not db_exists:
        schema_path = os.path.join(BASE_DIR, "schema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, "r") as f:
                conn.executescript(f.read())
            conn.commit()
    return conn


def init_db():
    """Create the database tables from schema.sql if they don't exist."""
    conn = get_db_connection()
    conn.close()


# ---------------------------------------------------------------------------
# Snippet helpers
# ---------------------------------------------------------------------------

def load_snippets():
    """Load all snippets from snippets.json."""
    snippets_path = os.path.join(BASE_DIR, "snippets.json")
    with open(snippets_path, "r") as f:
        return json.load(f)


def get_random_snippet(language, difficulty):
    """Return a random snippet for the given language and difficulty, or None."""
    snippets = load_snippets()
    lang_data = snippets.get(language)
    if lang_data is None:
        return None
    diff_data = lang_data.get(difficulty)
    if not diff_data:
        return None
    return random.choice(diff_data)


def find_snippet_by_id(snippet_id):
    """Look up a snippet by its ID. Returns (snippet, language, difficulty) or (None, None, None)."""
    snippets = load_snippets()
    for language, difficulties in snippets.items():
        for difficulty, snippet_list in difficulties.items():
            for snippet in snippet_list:
                if snippet["id"] == snippet_id:
                    return snippet, language, difficulty
    return None, None, None


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_attempt_payload(data):
    """Validate a submitted attempt. Returns (errors list, cleaned data dict)."""
    errors = []

    if not isinstance(data, dict):
        return ["Invalid JSON payload."], None

    snippet_id = data.get("snippet_id", "")
    language = data.get("language", "")
    difficulty = data.get("difficulty", "")

    # Check language
    if language not in LANGUAGES:
        errors.append(f"Unsupported language: {language}")

    # Check difficulty
    if difficulty not in DIFFICULTIES:
        errors.append(f"Unsupported difficulty: {difficulty}")

    # Check snippet exists and belongs to stated language/difficulty
    snippet, s_lang, s_diff = find_snippet_by_id(snippet_id)
    if snippet is None:
        errors.append(f"Unknown snippet ID: {snippet_id}")
    elif not errors:
        if s_lang != language or s_diff != difficulty:
            errors.append("Snippet does not match stated language/difficulty.")

    # Numeric validations
    try:
        wpm = float(data.get("wpm", -1))
        if wpm < 0:
            errors.append("WPM must be >= 0.")
    except (TypeError, ValueError):
        errors.append("WPM must be a number.")
        wpm = None

    try:
        accuracy = float(data.get("accuracy", -1))
        if accuracy < 0 or accuracy > 100:
            errors.append("Accuracy must be between 0 and 100.")
    except (TypeError, ValueError):
        errors.append("Accuracy must be a number.")
        accuracy = None

    try:
        err_count = int(data.get("errors", -1))
        if err_count < 0:
            errors.append("Errors must be >= 0.")
    except (TypeError, ValueError):
        errors.append("Errors must be an integer.")
        err_count = None

    try:
        duration = float(data.get("duration_seconds", 0))
        if duration <= 0:
            errors.append("Duration must be > 0.")
    except (TypeError, ValueError):
        errors.append("Duration must be a number.")
        duration = None

    if errors:
        return errors, None

    cleaned = {
        "snippet_id": snippet_id,
        "language": language,
        "difficulty": difficulty,
        "wpm": wpm,
        "accuracy": accuracy,
        "errors": err_count,
        "duration_seconds": duration,
    }
    return [], cleaned


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Render the home page."""
    return render_template("index.html", languages=LANGUAGES, difficulties=DIFFICULTIES)


@app.route("/test")
def test():
    """Render the typing test page for a given language and difficulty."""
    language = request.args.get("lang", "")
    difficulty = request.args.get("diff", "")

    if language not in LANGUAGES:
        flash("Please select a valid programming language.", "error")
        return redirect(url_for("index"))

    if difficulty not in DIFFICULTIES:
        flash("Please select a valid difficulty.", "error")
        return redirect(url_for("index"))

    snippet = get_random_snippet(language, difficulty)
    if snippet is None:
        flash("No snippets found for that combination.", "error")
        return redirect(url_for("index"))

    return render_template(
        "test.html",
        language=language,
        difficulty=difficulty,
        snippet=snippet,
    )


@app.route("/api/attempts", methods=["POST"])
def save_attempt():
    """Save a completed typing-test attempt."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"success": False, "errors": ["Invalid JSON."]}), 400

    errors, cleaned = validate_attempt_payload(data)
    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    try:
        conn = get_db_connection()
        conn.execute(
            """INSERT INTO attempts
               (snippet_id, language, difficulty, wpm, accuracy, errors, duration_seconds)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                cleaned["snippet_id"],
                cleaned["language"],
                cleaned["difficulty"],
                cleaned["wpm"],
                cleaned["accuracy"],
                cleaned["errors"],
                cleaned["duration_seconds"],
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error:
        return jsonify({"success": False, "errors": ["Database error."]}), 500

    return jsonify({"success": True})


@app.route("/history")
def history():
    """Render the history page with summary and per-language stats."""
    conn = get_db_connection()

    # Overall summary
    summary = conn.execute(
        """SELECT COUNT(*) AS total,
                  MAX(wpm) AS best_wpm,
                  AVG(wpm) AS avg_wpm,
                  AVG(accuracy) AS avg_accuracy
           FROM attempts"""
    ).fetchone()

    # Per-language breakdown
    lang_stats = conn.execute(
        """SELECT language,
                  COUNT(*) AS tests,
                  MAX(wpm) AS best_wpm,
                  AVG(wpm) AS avg_wpm,
                  AVG(accuracy) AS avg_accuracy
           FROM attempts
           GROUP BY language
           ORDER BY language"""
    ).fetchall()

    # Recent attempts (newest first)
    attempts = conn.execute(
        """SELECT * FROM attempts
           ORDER BY created_at DESC
           LIMIT 50"""
    ).fetchall()

    conn.close()

    return render_template(
        "history.html",
        summary=summary,
        lang_stats=lang_stats,
        attempts=attempts,
    )


@app.route("/history/clear", methods=["POST"])
def clear_history():
    """Delete all attempts and redirect to history."""
    conn = get_db_connection()
    conn.execute("DELETE FROM attempts")
    conn.commit()
    conn.close()
    flash("History cleared.", "success")
    return redirect(url_for("history"))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
