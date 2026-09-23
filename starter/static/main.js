// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const LEADERBOARD_KEY = 'sudokuLeaderboard';
let puzzle = [];
let timerInterval = null;
let elapsedSeconds = 0;
let hintCount = 0;
let gameCompleted = false;

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
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
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame() {
  const difficulty = document.getElementById('difficulty').value;
  const res = await fetch(`/new?difficulty=${difficulty}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  resetTimer();
  hintCount = 0;
  gameCompleted = false;
  document.getElementById('message').innerText = '';
}

function updateTimer() {
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  document.getElementById('timer').innerText = `${minutes}:${seconds}`;
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

function saveGameResult(playerName, completionTime, difficulty, hints) {
  const results = getSavedResults();
  results.push({
    playerName: playerName.trim() || 'Player',
    completionTime,
    difficulty,
    hintCount: hints,
    savedAt: Date.now()
  });
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(results));
}

function getSavedResults() {
  try {
    const results = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    return Array.isArray(results) ? results : [];
  } catch (error) {
    return [];
  }
}

function getTopTenResults() {
  return getSavedResults()
    .filter(result => Number.isFinite(result.completionTime))
    .sort((first, second) => first.completionTime - second.completionTime)
    .slice(0, 10);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function displayLeaderboard() {
  const tableBody = document.getElementById('leaderboard-body');
  tableBody.innerHTML = '';
  getTopTenResults().forEach((result, index) => {
    const row = document.createElement('tr');
    [index + 1, result.playerName, formatTime(result.completionTime),
      result.difficulty, result.hintCount].forEach(value => {
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
  const playerName = document.getElementById('player-name').value;
  const difficulty = document.getElementById('difficulty').value;
  saveGameResult(playerName, elapsedSeconds, difficulty, hintCount);
  gameCompleted = true;
}

function getBoard() {
  const inputs = document.getElementById('sudoku-board').getElementsByTagName('input');
  const board = [];
  for (let row = 0; row < SIZE; row++) {
    board[row] = [];
    for (let column = 0; column < SIZE; column++) {
      const value = inputs[row * SIZE + column].value;
      board[row][column] = value ? parseInt(value, 10) : 0;
    }
  }
  return {board, inputs};
}

async function requestHint() {
  const {board, inputs} = getBoard();
  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const input = inputs[data.row * SIZE + data.column];
  input.value = data.value;
  input.className = 'sudoku-cell hint';
  hintCount += 1;
  msg.style.color = '#388e3c';
  msg.innerText = 'A hint has been filled in.';
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
    if (!gameCompleted) {
      recordCompletion();
    }
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', requestHint);
  document.getElementById('difficulty').addEventListener('change', newGame);
  document.getElementById('leaderboard').addEventListener('click', displayLeaderboard);
  document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').close();
  });
  // initialize
  newGame();
});