import pytest

import sudoku_logic
from app import app


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def test_main_page(client):
    response = client.get('/')

    assert response.status_code == 200
    assert b'Sudoku Game' in response.data
    assert b'id="sudoku-board"' in response.data


def test_board_generation_returns_requested_number_of_clues():
    clues = 35

    puzzle, solution = sudoku_logic.generate_puzzle(clues)

    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert len(solution) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in solution)
    assert sum(cell != sudoku_logic.EMPTY for row in puzzle for cell in row) == clues
    assert all(
        puzzle[row][column] in (sudoku_logic.EMPTY, solution[row][column])
        for row in range(sudoku_logic.SIZE)
        for column in range(sudoku_logic.SIZE)
    )


def test_generated_solution_is_valid():
    _, solution = sudoku_logic.generate_puzzle()

    for row in range(sudoku_logic.SIZE):
        for column in range(sudoku_logic.SIZE):
            value = solution[row][column]
            solution[row][column] = sudoku_logic.EMPTY
            assert sudoku_logic.is_safe(solution, row, column, value)
            solution[row][column] = value


def test_validator_accepts_value_when_row_column_and_box_are_valid():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1
    board[1][1] = 2

    assert sudoku_logic.is_safe(board, 0, 2, 3)


def test_validator_rejects_duplicate_in_row():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 0, 4, 5)


def test_validator_rejects_duplicate_in_column():
    board = sudoku_logic.create_empty_board()
    board[0][2] = 6

    assert not sudoku_logic.is_safe(board, 5, 2, 6)


def test_validator_rejects_duplicate_in_3x3_grid():
    board = sudoku_logic.create_empty_board()
    board[1][1] = 7

    assert not sudoku_logic.is_safe(board, 2, 2, 7)
def test_check_marks_empty_cells_as_incorrect(client):
    response = client.get('/new?difficulty=easy')
    assert response.status_code == 200

    data = response.get_json()
    puzzle = data['puzzle']

    board = [row[:] for row in puzzle]

    response = client.post(
        '/check',
        json={'board': board}
    )

    assert response.status_code == 200

    result = response.get_json()
    incorrect = result['incorrect']

    empty_cells = [
        [row, column]
        for row in range(9)
        for column in range(9)
        if puzzle[row][column] == 0
    ]

    assert empty_cells
    assert all(cell in incorrect for cell in empty_cells)


def test_check_rejects_invalid_board(client):
    client.get('/new?difficulty=easy')

    response = client.post(
        '/check',
        json={'board': [[0]]}
    )

    assert response.status_code == 400