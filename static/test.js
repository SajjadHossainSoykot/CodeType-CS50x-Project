// AI assistance: ChatGPT was used for project planning, and Google
// Antigravity was used to assist with portions of this implementation.

(function () {
    "use strict";

    // -----------------------------------------------------------------------
    // Parse snippet data from embedded JSON
    // -----------------------------------------------------------------------
    const snippetDataEl = document.getElementById("snippet-data");
    const snippet = JSON.parse(snippetDataEl.textContent);
    const targetCode = snippet.code;
    const TEST_LANGUAGE = snippetDataEl.dataset.language;
    const TEST_DIFFICULTY = snippetDataEl.dataset.difficulty;

    // -----------------------------------------------------------------------
    // DOM references
    // -----------------------------------------------------------------------
    const codeDisplay = document.getElementById("code-display");
    const typingInput = document.getElementById("typing-input");
    const typingHint = document.getElementById("typing-hint");
    const restartBtn = document.getElementById("restart-btn");
    const tryAgainBtn = document.getElementById("try-again-btn");

    // Stats HUD
    const statTime = document.getElementById("stat-time");
    const statWpm = document.getElementById("stat-wpm");
    const statAccuracy = document.getElementById("stat-accuracy");
    const statMistakes = document.getElementById("stat-mistakes");

    // Result panel
    const resultPanel = document.getElementById("result-panel");
    const resultWpm = document.getElementById("result-wpm");
    const resultAccuracy = document.getElementById("result-accuracy");
    const resultMistakes = document.getElementById("result-mistakes");
    const resultTime = document.getElementById("result-time");
    const resultSaveMsg = document.getElementById("result-save-msg");

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let timerStarted = false;
    let startTime = null;
    let timerInterval = null;
    let elapsedSeconds = 0;
    let totalKeystrokes = 0;    // character-entry keystrokes (not modifiers)
    let mistakes = 0;
    let finished = false;

    // -----------------------------------------------------------------------
    // Initialize display — render each character as a <span>
    // -----------------------------------------------------------------------
    function renderCodeDisplay() {
        codeDisplay.innerHTML = "";
        for (let i = 0; i < targetCode.length; i++) {
            const span = document.createElement("span");
            span.classList.add("char");

            if (targetCode[i] === "\n") {
                span.classList.add("char-newline");
                span.textContent = "\n";
            } else {
                span.textContent = targetCode[i];
            }

            codeDisplay.appendChild(span);
        }
        // Mark first character as current
        const chars = codeDisplay.querySelectorAll(".char");
        if (chars.length > 0) {
            chars[0].classList.add("current");
        }
    }

    // -----------------------------------------------------------------------
    // Timer
    // -----------------------------------------------------------------------
    function startTimer() {
        timerStarted = true;
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 100);
        typingHint.style.opacity = "0";
    }

    function updateTimer() {
        elapsedSeconds = (Date.now() - startTime) / 1000;
        statTime.textContent = elapsedSeconds.toFixed(1) + "s";
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        // Final update
        if (startTime) {
            elapsedSeconds = (Date.now() - startTime) / 1000;
            statTime.textContent = elapsedSeconds.toFixed(1) + "s";
        }
    }

    // -----------------------------------------------------------------------
    // WPM & Accuracy calculations
    // -----------------------------------------------------------------------
    function calculateWPM() {
        if (elapsedSeconds < 0.5) return 0;
        var minutes = elapsedSeconds / 60;
        var wordCount = targetCode.length / 5;
        return Math.round((wordCount / minutes) * 10) / 10;
    }

    function calculateAccuracy() {
        if (totalKeystrokes === 0) return 100;
        var acc = ((totalKeystrokes - mistakes) / totalKeystrokes) * 100;
        // Clamp between 0 and 100
        if (acc < 0) acc = 0;
        if (acc > 100) acc = 100;
        return Math.round(acc * 10) / 10;
    }

    // -----------------------------------------------------------------------
    // Update the character display based on current typed text
    // -----------------------------------------------------------------------
    function updateDisplay() {
        const typed = typingInput.value;
        const chars = codeDisplay.querySelectorAll(".char");

        for (let i = 0; i < chars.length; i++) {
            chars[i].classList.remove("correct", "incorrect", "current");

            if (i < typed.length) {
                // Character has been typed
                if (typed[i] === targetCode[i]) {
                    chars[i].classList.add("correct");
                } else {
                    chars[i].classList.add("incorrect");
                }
            } else if (i === typed.length) {
                // Current position
                chars[i].classList.add("current");
            }
            // Remaining characters have no class (default dim)
        }

        // Update live stats
        statWpm.textContent = calculateWPM();
        statAccuracy.textContent = calculateAccuracy() + "%";
        statMistakes.textContent = mistakes;
    }

    // -----------------------------------------------------------------------
    // Completion check
    // -----------------------------------------------------------------------
    function checkCompletion() {
        if (typingInput.value === targetCode) {
            finishTest();
        }
    }

    // -----------------------------------------------------------------------
    // Finish the test
    // -----------------------------------------------------------------------
    function finishTest() {
        finished = true;
        stopTimer();
        typingInput.disabled = true;

        var wpm = calculateWPM();
        var accuracy = calculateAccuracy();

        // Update result panel
        resultWpm.textContent = wpm;
        resultAccuracy.textContent = accuracy + "%";
        resultMistakes.textContent = mistakes;
        resultTime.textContent = elapsedSeconds.toFixed(1) + "s";
        resultPanel.style.display = "block";

        // Scroll result into view
        resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

        // Save attempt
        saveAttempt(wpm, accuracy);
    }

    // -----------------------------------------------------------------------
    // Save attempt to backend via fetch
    // -----------------------------------------------------------------------
    function saveAttempt(wpm, accuracy) {
        var payload = {
            snippet_id: snippet.id,
            language: TEST_LANGUAGE,
            difficulty: TEST_DIFFICULTY,
            wpm: wpm,
            accuracy: accuracy,
            errors: mistakes,
            duration_seconds: Math.round(elapsedSeconds * 10) / 10
        };

        fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                resultSaveMsg.textContent = "Result saved.";
                resultSaveMsg.classList.remove("error");
            } else {
                resultSaveMsg.textContent = "Your score was calculated, but it could not be saved.";
                resultSaveMsg.classList.add("error");
            }
        })
        .catch(function () {
            resultSaveMsg.textContent = "Your score was calculated, but it could not be saved.";
            resultSaveMsg.classList.add("error");
        });
    }

    // -----------------------------------------------------------------------
    // Reset the test
    // -----------------------------------------------------------------------
    function resetTest() {
        finished = false;
        timerStarted = false;
        startTime = null;
        elapsedSeconds = 0;
        totalKeystrokes = 0;
        mistakes = 0;

        stopTimer();

        typingInput.value = "";
        typingInput.disabled = false;
        typingInput.focus();

        statTime.textContent = "0.0s";
        statWpm.textContent = "0";
        statAccuracy.textContent = "100%";
        statMistakes.textContent = "0";

        resultPanel.style.display = "none";
        resultSaveMsg.textContent = "";

        typingHint.style.opacity = "1";

        renderCodeDisplay();
    }

    // -----------------------------------------------------------------------
    // Input event handler
    // -----------------------------------------------------------------------
    typingInput.addEventListener("input", function (e) {
        if (finished) return;

        // Start timer on first character input
        if (!timerStarted && typingInput.value.length > 0) {
            startTimer();
        }

        updateDisplay();
        checkCompletion();
    });

    // -----------------------------------------------------------------------
    // Keydown handler — track keystrokes, handle Tab, prevent arrow-key cursor
    // -----------------------------------------------------------------------
    typingInput.addEventListener("keydown", function (e) {
        if (finished) return;

        // Tab: insert 4 spaces
        if (e.key === "Tab") {
            e.preventDefault();
            var start = typingInput.selectionStart;
            var before = typingInput.value.substring(0, start);
            var after = typingInput.value.substring(typingInput.selectionEnd);
            typingInput.value = before + "    " + after;
            typingInput.selectionStart = typingInput.selectionEnd = start + 4;

            // Start timer if needed
            if (!timerStarted) {
                startTimer();
            }

            // Count each space from Tab as a keystroke and check for mistakes
            for (var s = 0; s < 4; s++) {
                var pos = start + s;
                totalKeystrokes++;
                if (pos < targetCode.length && " " !== targetCode[pos]) {
                    mistakes++;
                }
            }

            updateDisplay();
            checkCompletion();
            return;
        }

        // Track character-entry keystrokes (not modifiers/control/nav keys)
        // Backspace is special: not a "typed character" keystroke
        if (e.key === "Backspace") {
            // Allowed, but does not count as a typed keystroke
            return;
        }

        // Single printable character key
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            totalKeystrokes++;
            var curPos = typingInput.value.length;  // position before this char is added
            if (curPos < targetCode.length && e.key !== targetCode[curPos]) {
                mistakes++;
            }
        }

        // Enter key → insert newline character & auto-indent matching leading spaces
        if (e.key === "Enter") {
            e.preventDefault();
            var startPos = typingInput.selectionStart;

            if (!timerStarted) {
                startTimer();
            }

            // Check if expected character is indeed a newline
            if (startPos < targetCode.length && targetCode[startPos] === "\n") {
                // Collect leading spaces on the next line for auto-indentation
                var autoIndent = "";
                var nextIdx = startPos + 1;
                while (nextIdx < targetCode.length && targetCode[nextIdx] === " ") {
                    autoIndent += " ";
                    nextIdx++;
                }

                var insertText = "\n" + autoIndent;
                var beforeEnter = typingInput.value.substring(0, startPos);
                var afterEnter = typingInput.value.substring(typingInput.selectionEnd);
                typingInput.value = beforeEnter + insertText + afterEnter;
                typingInput.selectionStart = typingInput.selectionEnd = startPos + insertText.length;

                totalKeystrokes += insertText.length;
            } else {
                // User pressed Enter when newline was not expected
                var beforeEnter = typingInput.value.substring(0, startPos);
                var afterEnter = typingInput.value.substring(typingInput.selectionEnd);
                typingInput.value = beforeEnter + "\n" + afterEnter;
                typingInput.selectionStart = typingInput.selectionEnd = startPos + 1;

                totalKeystrokes++;
                mistakes++;
            }

            updateDisplay();
            checkCompletion();
            return;
        }
    });

    // -----------------------------------------------------------------------
    // Prevent paste
    // -----------------------------------------------------------------------
    typingInput.addEventListener("paste", function (e) {
        e.preventDefault();
    });

    // -----------------------------------------------------------------------
    // Keep focus on typing input when clicking the typing area
    // -----------------------------------------------------------------------
    document.getElementById("typing-area").addEventListener("click", function () {
        if (!finished) {
            typingInput.focus();
        }
    });

    // -----------------------------------------------------------------------
    // Restart buttons
    // -----------------------------------------------------------------------
    restartBtn.addEventListener("click", resetTest);
    tryAgainBtn.addEventListener("click", resetTest);

    // -----------------------------------------------------------------------
    // Initial render
    // -----------------------------------------------------------------------
    renderCodeDisplay();
    typingInput.focus();

})();
