"""Start Howzat with backend reload and frontend hot updates: python3 dev.py."""
import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check dependencies without starting servers")
    args = parser.parse_args()
    python = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    npm = shutil.which("npm")
    if not python.exists() or not npm or not (ROOT / "frontend/node_modules").exists():
        parser.exit(1, "Install the dependencies in README.md first (Python .venv and frontend npm install).\n")
    check = subprocess.run([str(python), "-c", "import fastapi, uvicorn"], capture_output=True)
    if check.returncode:
        parser.exit(1, "Run .venv/bin/python -m pip install -r backend/requirements.txt first.\n")
    if args.check:
        print("Howzat dependencies are ready. Run python3 dev.py to start both servers.")
        return
    for port in (8000, 5173):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                parser.exit(1, f"Port {port} is already in use. Stop the existing server with Ctrl+C, then run python3 dev.py again.\n")
    processes = []
    try:
        commands = [
            ([str(python), "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload", "--reload-dir", str(ROOT / "backend")], ROOT),
            ([npm, "run", "dev", "--", "--port", "5173", "--strictPort"], ROOT / "frontend"),
        ]
        for command, cwd in commands:
            processes.append(subprocess.Popen(command, cwd=cwd, start_new_session=os.name != "nt"))
        print("\nHowzat: http://127.0.0.1:5173  |  Changes reload automatically. Ctrl+C stops both servers.\n", flush=True)
        while all(process.poll() is None for process in processes):
            time.sleep(0.2)
        raise SystemExit(next((process.returncode for process in processes if process.returncode is not None), 1))
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes:
            if process.poll() is None:
                if os.name == "nt":
                    process.terminate()
                else:
                    os.killpg(process.pid, signal.SIGTERM)
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                if os.name == "nt":
                    process.kill()
                else:
                    os.killpg(process.pid, signal.SIGKILL)

if __name__ == "__main__":
    main()
