class CompileError(Exception):
    def __init__(self, message, line=1, column=1, end_column=None):
        super().__init__(message)
        self.line = line
        self.column = column
        self.end_column = end_column

    def as_dict(self):
        result = {"message": str(self), "line": self.line, "column": self.column}
        if self.end_column is not None:
            result["end_column"] = self.end_column
        return result

def error_at(message, node):
    return CompileError(message, node.get("line", 1), node.get("column", 1), node.get("end_column"))
