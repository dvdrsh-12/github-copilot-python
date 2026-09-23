import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board):
    """Count Sudoku solutions, stopping once more than one is found."""
    for row in range(SIZE):
        for col in range(SIZE):
            value = board[row][col]
            if value != EMPTY:
                board[row][col] = EMPTY
                valid = 1 <= value <= SIZE and is_safe(board, row, col, value)
                board[row][col] = value
                if not valid:
                    return 0

    def count_from_current_state():
        empty_cell = None
        for row in range(SIZE):
            for col in range(SIZE):
                if board[row][col] == EMPTY:
                    empty_cell = (row, col)
                    break
            if empty_cell is not None:
                break

        if empty_cell is None:
            return 1

        row, col = empty_cell
        solution_count = 0
        for candidate in range(1, SIZE + 1):
            if is_safe(board, row, col, candidate):
                board[row][col] = candidate
                solution_count += count_from_current_state()
                board[row][col] = EMPTY
                if solution_count > 1:
                    return solution_count

        return solution_count

    return count_from_current_state()


def has_unique_solution(board):
    return count_solutions(board) == 1


def remove_cells(board, clues):
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)

    for row, col in cells:
        if sum(cell != EMPTY for row in board for cell in row) <= clues:
            break

        value = board[row][col]
        board[row][col] = EMPTY
        if count_solutions(board) != 1:
            board[row][col] = value

def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
