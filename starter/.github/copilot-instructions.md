# GitHub Copilot Instructions for Sudoku App

- Frameworks: Python 3.10+, Flask, HTML5, Vanilla JavaScript, CSS3.
- Architecture: Keep `app.py` minimal (routing/API endpoints only). Place core Sudoku generation, validation, and solver algorithms in `sudoku_logic.py`.
- Code Quality: Follow PEP 8 for Python. Ensure all error handling returns appropriate HTTP status codes and JSON response bodies.
- Sudoku Business Rules:
  1. Boards must be generated based on difficulty (`easy`: ~40 prefilled, `medium`: ~32 prefilled, `hard`: ~24 prefilled).
  2. Every generated puzzle MUST have a unique solution verified by a backtracking solver.
- UI/UX: High contrast, responsive grid using CSS Grid. Use alternating shading for 3x3 blocks to improve scannability.