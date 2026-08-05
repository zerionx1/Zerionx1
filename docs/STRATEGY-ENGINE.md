# Strategy Engine

A strategy is stored as typed nodes plus directed edges. Source, indicator, condition, logic, risk, entry and exit nodes are validated before compilation. The compiler rejects orphan edges, missing entry/exit logic, excessive risk and cyclic graphs. A validated strategy may be used for educational backtests and paper workflows only until later execution controls are completed.
