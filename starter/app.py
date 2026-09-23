import random

from flask import Flask, render_template, jsonify, request
from sudoku_logic import SIZE, generate_puzzle, has_unique_solution

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None
}

DIFFICULTY_CLUES = {
    'easy': 40,
    'medium': 32,
    'hard': 24,
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new_game')
@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'easy').lower()
    if difficulty not in DIFFICULTY_CLUES:
        return jsonify({'error': 'Invalid difficulty'}), 400

    clues = DIFFICULTY_CLUES[difficulty]
    if 'clues' in request.args:
        clues = int(request.args['clues'])

    puzzle, solution = generate_puzzle(clues)
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    return jsonify({
        'puzzle': puzzle,
        'unique': has_unique_solution(puzzle),
    })

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.json
    board = data.get('board')
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    incorrect = []
    for i in range(SIZE):
        for j in range(SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})


@app.route('/hint', methods=['POST'])
def hint():
    data = request.get_json(silent=True) or {}
    board = data.get('board')
    solution = CURRENT.get('solution')

    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if not is_valid_board(board):
        return jsonify({'error': 'Board must be a 9x9 grid of numbers'}), 400

    empty_cells = [
        (row, column)
        for row in range(SIZE)
        for column in range(SIZE)
        if board[row][column] == 0
    ]
    if not empty_cells:
        return jsonify({'error': 'The board has no empty cells'}), 400

    row, column = random.choice(empty_cells)
    return jsonify({
        'row': row,
        'column': column,
        'value': solution[row][column],
    })


def is_valid_board(board):
    return (
        isinstance(board, list)
        and len(board) == SIZE
        and all(
            isinstance(row, list)
            and len(row) == SIZE
            and all(isinstance(value, int) and not isinstance(value, bool)
                    and 0 <= value <= SIZE for value in row)
            for row in board
        )
    )

if __name__ == '__main__':
    app.run(debug=True)