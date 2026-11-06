"""Compiler phase orchestration. See docs/CONTRACTS.md for module interfaces."""
from importlib import import_module
import json
import logging
import time
from .errors import CompileError
from .execution import execute_target
from .results import match_result

logger = logging.getLogger(__name__)
NAMES = ["Lexical analysis", "Syntax analysis", "Semantic analysis",
         "Intermediate code", "Code optimization", "Target code generation"]
MODULES = ["lexer", "parser", "semantic", "ir", "optimizer", "target"]
FUNCTIONS = [("tokenize",), ("parse",), ("validate",),
             ("generate_ir", "format_ir"), ("optimize",), ("generate_target",)]


def load_phase(index):
    name = f"{__package__}.{MODULES[index]}"
    try:
        module = import_module(name)
    except ModuleNotFoundError as error:
        if error.name == name:
            return None
        raise
    return module if all(callable(getattr(module, fn, None)) for fn in FUNCTIONS[index]) else None


def phase_manifest():
    phases = []
    for index, name in enumerate(NAMES):
        try:
            available = load_phase(index) is not None
        except Exception:
            available = False
        phases.append({"phase": index, "name": name, "available": available})
    return phases


def run_phase(index, context, module):
    if index == 0:
        context["tokens"] = module.tokenize(context["source"])
        return {"tokens": context["tokens"]}
    if index == 1:
        context["ast"], tree = module.parse(context["tokens"])
        return {"ast": context["ast"], "parse_tree": tree}
    if index == 2:
        return module.validate(context["ast"])
    if index == 3:
        context["ir"] = module.generate_ir(context["ast"])
        context["format_ir"] = module.format_ir
        return {"instructions": context["ir"], "code": module.format_ir(context["ir"])}
    if index == 4:
        context["optimized"], changes = module.optimize(context["ir"])
        format_ir = context["format_ir"]
        return {"before": format_ir(context["ir"]), "after": format_ir(context["optimized"]),
                "before_count": len(context["ir"]), "after_count": len(context["optimized"]),
                "changes": changes, "instructions": context["optimized"]}
    code = module.generate_target(context["optimized"], context["ast"])
    scorecard = execute_target(code)
    teams = {team["id"]: team["name"] for team in context["ast"]["teams"]}
    scorecard["result"] = match_result(scorecard["innings"], teams)
    return {"code": code, "scorecard": scorecard}


def compile_events(source, loader=None):
    """Stream real phase transitions; loader injection permits driver-only tests."""
    loader = loader or load_phase
    context = {"source": source}
    for index, name in enumerate(NAMES):
        event = {"phase": index, "name": name}
        started = time.perf_counter()
        try:
            module = loader(index)
            if module is None:
                yield {**event, "status": "unavailable", "message": f"{name} is unavailable. Check the compiler module configuration."}
                for later in range(index + 1, len(NAMES)):
                    yield {"phase": later, "name": NAMES[later], "status": "skipped"}
                return
            yield {**event, "status": "running"}
            output = run_phase(index, context, module)
            json.dumps(output)
        except CompileError as error:
            yield {**event, "status": "failed", "error": error.as_dict(),
                   "duration_ms": round((time.perf_counter() - started) * 1000, 2)}
        except Exception:
            logger.exception("Compiler phase failed: %s", name)
            yield {**event, "status": "failed", "error": {
                "message": "This compiler phase encountered an internal error.", "line": 1, "column": 1}}
        else:
            yield {**event, "status": "completed", "output": output,
                   "duration_ms": round((time.perf_counter() - started) * 1000, 2)}
            continue
        for later in range(index + 1, len(NAMES)):
            yield {"phase": later, "name": NAMES[later], "status": "skipped"}
        return
