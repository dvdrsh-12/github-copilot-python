
const SIZE = 9;
const LEADERBOARD_KEY = 'sudokuLeaderboard';
const THEME_KEY = 'sudokuTheme';

let puzzle = [];
let timerInterval = null;
let elapsedSeconds = 0;
let hintCount = 0;
let gameCompleted = false;


// ==================== THEME MANAGEMENT ====================

function applyTheme(theme) {
  const isDark = theme === 'dark';

  document.body.classList.toggle('dark-mode', isDark);

  const themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.textContent = isDark
      ? '☀️ Light Mode'
      : '🌙 Dark Mode';
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches;

  applyTheme(prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  const newTheme = isDark ? 'light' : 'dark';

  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
}


// ==================== BOARD CREATION ====================

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';

  for (let row = 0; row < SIZE; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';

    for (let column = 0; column < SIZE; column++) {
      const input = document.createElement('input');

      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = column;

      input.setAttribute(
        'aria-label',
        `Row ${row + 1}, Column ${column + 1}`
      );

      input.addEventListener('input', (event) => {
        const inputElement = event.target;
        const value = inputElement.value.replace(/[^1-9]/g, '');

        inputElement.value = value;

        // Remove the old Check Solution highlighting
        // from the cell that the user is editing.
        inputElement.classList.remove('incorrect');

        // Check row, column, and 3x3-box conflicts immediately.
        refreshConflictHighlights();

        const message = document.getElementById('message');

        if (message && !gameCompleted) {
          message.textContent = '';
        }
      });

      rowDiv.appendChild(input);
    }

    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();

  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');

  for (let row = 0; row < SIZE; row++) {
    for (let column = 0; column < SIZE; column++) {
      const index = row * SIZE + column;
      const value = puzzle[row][column];
      const input = inputs[index];

      if (value !== 0) {
        input.value = value;
        input.disabled = true;
        input.classList.add('prefilled');
      } else {
        input.value = '';
        input.disabled = false;
      }
    }
  }
}


// ==================== BOARD READING ====================

function getBoard() {
  const inputs = document
    .getElementById('sudoku-board')
    .getElementsByTagName('input');

  const board = [];

  for (let row = 0; row < SIZE; row++) {
    board[row] = [];

    for (let column = 0; column < SIZE; column++) {
      const value = inputs[row * SIZE + column].value;

      board[row][column] = value
        ? parseInt(value, 10)
        : 0;
    }
  }

  return {board, inputs};
}


// ==================== IMMEDIATE CONFLICT VALIDATION ====================

function findConflicts(board, row, column, value) {
  const conflicts = [];

  if (value === 0) {
    return conflicts;
  }

  for (let currentColumn = 0; currentColumn < SIZE; currentColumn++) {
    if (
      currentColumn !== column &&
      board[row][currentColumn] === value
    ) {
      conflicts.push([row, currentColumn]);
    }
  }

  for (let currentRow = 0; currentRow < SIZE; currentRow++) {
    if (
      currentRow !== row &&
      board[currentRow][column] === value
    ) {
      conflicts.push([currentRow, column]);
    }
  }

  const startRow = row - (row % 3);
  const startColumn = column - (column % 3);

  for (let currentRow = startRow; currentRow < startRow + 3; currentRow++) {
    for (
      let currentColumn = startColumn;
      currentColumn < startColumn + 3;
      currentColumn++
    ) {
      if (
        (currentRow !== row || currentColumn !== column) &&
        board[currentRow][currentColumn] === value
      ) {
        conflicts.push([currentRow, currentColumn]);
      }
    }
  }

  return conflicts;
}

function refreshConflictHighlights() {
  const {board, inputs} = getBoard();

  // Clear all previous immediate-conflict highlights.
  for (const input of inputs) {
    input.classList.remove('invalid-entry');
  }

  for (let row = 0; row < SIZE; row++) {
    for (let column = 0; column < SIZE; column++) {
      const value = board[row][column];

      if (value === 0) {
        continue;
      }

      const conflicts = findConflicts(
        board,
        row,
        column,
        value
      );

      if (conflicts.length === 0) {
        continue;
      }

      const currentIndex = row * SIZE + column;

      if (!inputs[currentIndex].disabled) {
        inputs[currentIndex].classList.add('invalid-entry');
      }

      for (const [conflictRow, conflictColumn] of conflicts) {
        const conflictIndex =
          conflictRow * SIZE + conflictColumn;

        if (!inputs[conflictIndex].disabled) {
          inputs[conflictIndex].classList.add('invalid-entry');
        }
      }
    }
  }
}


// ==================== GAME AND TIMER ====================

async function newGame() {
  const difficulty = document.getElementById('difficulty').value;

  const res = await fetch(`/new?difficulty=${difficulty}`);
  const data = await res.json();

  if (data.error) {
    document.getElementById('message').textContent = data.error;
    return;
  }

  renderPuzzle(data.puzzle);
  resetTimer();

  hintCount = 0;
  gameCompleted = false;

  document.getElementById('message').textContent = '';
}

function updateTimer() {
  const minutes = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, '0');

  const seconds = (elapsedSeconds % 60)
    .toString()
    .padStart(2, '0');

  document.getElementById('timer').textContent =
    `${minutes}:${seconds}`;
}

function resetTimer() {
  clearInterval(timerInterval);

  elapsedSeconds = 0;
  updateTimer();

  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}


// ==================== LEADERBOARD ====================

function saveGameResult(
  playerName,
  completionTime,
  difficulty,
  hints
) {
  const results = getSavedResults();

  results.push({
    playerName: playerName.trim() || 'Player',
    completionTime,
    difficulty,
    hintCount: hints,
    savedAt: Date.now()
  });

  const topTen = results
    .filter(result => Number.isFinite(result.completionTime))
    .sort(
      (first, second) =>
        first.completionTime - second.completionTime
    )
    .slice(0, 10);

  localStorage.setItem(
    LEADERBOARD_KEY,
    JSON.stringify(topTen)
  );
}

function getSavedResults() {
  try {
    const results = JSON.parse(
      localStorage.getItem(LEADERBOARD_KEY) || '[]'
    );

    return Array.isArray(results) ? results : [];
  } catch (error) {
    return [];
  }
}

function getTopTenResults() {
  return getSavedResults()
    .filter(result => Number.isFinite(result.completionTime))
    .sort(
      (first, second) =>
        first.completionTime - second.completionTime
    )
    .slice(0, 10);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');

  const seconds = (totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function displayLeaderboard() {
  const tableBody = document.getElementById('leaderboard-body');
  tableBody.innerHTML = '';

  getTopTenResults().forEach((result, index) => {
    const row = document.createElement('tr');

    [
      index + 1,
      result.playerName,
      formatTime(result.completionTime),
      result.difficulty,
      result.hintCount
    ].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  document.getElementById('leaderboard-modal').showModal();
}

function recordCompletion() {
  clearInterval(timerInterval);

  const playerName =
    document.getElementById('player-name').value;

  const difficulty =
    document.getElementById('difficulty').value;

  saveGameResult(
    playerName,
    elapsedSeconds,
    difficulty,
    hintCount
  );

  gameCompleted = true;
}


// ==================== HINT ====================

async function requestHint() {
  const {board, inputs} = getBoard();

  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });

  const data = await res.json();
  const message = document.getElementById('message');

  if (data.error) {
    message.style.color = '#d32f2f';
    message.textContent = data.error;
    return;
  }

  const index = data.row * SIZE + data.column;
  const input = inputs[index];

  input.value = data.value;
  input.disabled = true;
  input.readOnly = true;
  input.className = 'sudoku-cell hint';

  input.setAttribute(
    'aria-label',
    'Hint-filled locked cell'
  );

  hintCount += 1;

  refreshConflictHighlights();

  message.style.color = '#388e3c';
  message.textContent =
    'A hint has been filled in and locked.';
}


// ==================== CHECK SOLUTION ====================

async function checkSolution() {
  const {board, inputs} = getBoard();

  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });

  const data = await res.json();
  const message = document.getElementById('message');

  if (data.error) {
    message.style.color = '#d32f2f';
    message.textContent = data.error;
    return;
  }

  const incorrect = new Set(
    data.incorrect.map(
      ([row, column]) => row * SIZE + column
    )
  );

  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index];

    // Keep prefilled and hint-filled cells locked.
    if (input.disabled) {
      continue;
    }

    // Remove previous Check Solution status.
    input.classList.remove('incorrect');

    // Highlight every missing or incorrect editable cell.
    if (incorrect.has(index)) {
      input.classList.add('incorrect');
    }
  }

  if (incorrect.size === 0) {
    message.style.color = '#388e3c';
    message.textContent =
      'Congratulations! You solved it!';

    if (!gameCompleted) {
      recordCompletion();
    }
  } else {
    message.style.color = '#d32f2f';
    message.textContent =
      `${incorrect.size} cell(s) are empty or incorrect.`;
  }
}


// ==================== EVENT LISTENERS ====================

window.addEventListener('load', () => {
  document
    .getElementById('new-game')
    .addEventListener('click', newGame);

  document
    .getElementById('check-solution')
    .addEventListener('click', checkSolution);

  document
    .getElementById('hint')
    .addEventListener('click', requestHint);

  document
    .getElementById('difficulty')
    .addEventListener('change', newGame);

  document
    .getElementById('leaderboard')
    .addEventListener('click', displayLeaderboard);

  document
    .getElementById('close-leaderboard')
    .addEventListener('click', () => {
      document.getElementById('leaderboard-modal').close();
    });

  document
    .getElementById('theme-toggle')
    .addEventListener('click', toggleTheme);

  initializeTheme();
  newGame();
});