#!/usr/bin/env python3
"""Minimal browser verif orchestrator for Triadic Grid Run.
Starts a short-lived http.server (no &), launches chromium on the served-style localhost URL with ?verif=1,
captures screenshot after auto-interact (start + stamps + triad), collects logs.
Uses only stdlib + available chromium. No installs.
"""
import http.server
import socketserver
import threading
import subprocess
import time
import os
import sys
import shutil
from datetime import datetime

WO_DIR = ".factoryx/work-orders/work-order-1783129017720-7-14"
os.makedirs(WO_DIR, exist_ok=True)

PORT = 18476  # chosen non-standard to avoid mismatch with any other
ENTRY = "games/92-triadic-grid-run/index.html"
# Use a served-style path under /factoryx/bauhaus/previews style emulation (no port mismatch to runtime preview intent)
# But localhost for this runtime execution; the path segment matches what preview deploys use.
URL = f"http://localhost:{PORT}/factoryx/bauhaus/previews/work-order-1783129017720-7-14/{ENTRY}?verif=1"
# Note: we will chdir and serve so that /factoryx/... resolves relative under cwd? Wait, serve root at ., request path must match.

# Actually to make relative assets resolve, serve from checkout root, request path must include the games/...
# To emulate preview layout exactly: the deployed preview has files at <root>/games/... and also redirect at root.
# For this, we serve the cwd as / , use path /games/... 

URL = f"http://localhost:{PORT}/games/92-triadic-grid-run/index.html?verif=1"
# This is the direct artifact URL as served under preview tree (entry redirects to it in prod)

SCREENSHOT = os.path.join(WO_DIR, "active-play-screenshot.png")
LOG_PATH = os.path.join(WO_DIR, "browser-verif.log")
HTTP_LOG = os.path.join(WO_DIR, "httpd.log")

def log(msg):
    print(msg, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.utcnow().isoformat()}] {msg}\n")

def start_http_server(port, directory, logf):
    os.chdir(directory)
    handler = http.server.SimpleHTTPRequestHandler
    # quiet logging to file
    class QuietHandler(handler):
        def log_message(self, fmt, *args):
            try:
                with open(logf, "a", encoding="utf-8") as lf:
                    lf.write(f"{datetime.utcnow().isoformat()} - {fmt % args}\n")
            except: pass
    httpd = socketserver.TCPServer(("", port), QuietHandler)
    httpd.allow_reuse_address = True
    th = threading.Thread(target=httpd.serve_forever, daemon=True)
    th.start()
    return httpd, th

def main():
    root = os.getcwd()
    if not os.path.isfile(ENTRY):
        log(f"ERROR: entrypoint {ENTRY} not found from {root}")
        sys.exit(1)

    # clean prior
    for p in (SCREENSHOT, LOG_PATH, HTTP_LOG):
        try: os.unlink(p)
        except: pass

    log(f"START verif. artifact={ENTRY}")
    log(f"serving at exact URL (localhost emulation of preview serve): {URL}")
    log(f"chromium: /usr/bin/chromium  PIL available for post if needed")

    # start server thread
    httpd, th = start_http_server(PORT, root, HTTP_LOG)
    time.sleep(0.6)  # allow bind

    # run chromium foreground bounded (no bare &)
    chromium_cmd = [
        "/usr/bin/chromium",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--virtual-time-budget=5800",
        "--window-size=1280,820",
        "--user-data-dir=/tmp/chromium-verif-triadic-{}".format(os.getpid()),
        "--enable-logging=stderr",
        "--log-level=1",
        f"--screenshot={SCREENSHOT}",
        URL,
    ]
    log("LAUNCH: " + " ".join(chromium_cmd))
    try:
        proc = subprocess.run(
            chromium_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=12,
            text=True,
            cwd=root,
        )
        exit_code = proc.returncode
        output = proc.stdout or ""
    except subprocess.TimeoutExpired as te:
        exit_code = 124
        output = (te.stdout or b"") + (te.stderr or b"") 
        output = output.decode("utf-8", "replace") if isinstance(output, (bytes, bytearray)) else str(output)
        log("CHROMIUM TIMED OUT (still captured what we could)")
    except Exception as ex:
        exit_code = 99
        output = str(ex)
        log(f"CHROMIUM LAUNCH FAIL: {ex}")

    # write full log
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write("\n=== CHROMIUM OUTPUT ===\n")
        f.write(output)
        f.write(f"\n=== EXIT CODE: {exit_code} ===\n")

    log(f"CHROMIUM DONE exit={exit_code}")

    # stop server
    try:
        httpd.shutdown()
    except: pass

    # check evidence
    if os.path.exists(SCREENSHOT) and os.path.getsize(SCREENSHOT) > 2000:
        size = os.path.getsize(SCREENSHOT)
        log(f"SUCCESS: active-play screenshot captured size={size} at {SCREENSHOT}")
        # also copy a timestamped for archive
        ts_copy = os.path.join(WO_DIR, f"active-play-{int(time.time())}.png")
        try: shutil.copy(SCREENSHOT, ts_copy)
        except: pass
    else:
        log("FAIL: no usable screenshot produced")

    # scan log for errors
    errors = []
    try:
        with open(LOG_PATH, encoding="utf-8") as f:
            content = f.read()
        for line in content.splitlines():
            if any(x in line.lower() for x in ["error", "traceback", "uncaught", "failed to load", "404", "net::", "page error"]):
                errors.append(line[:200])
    except: pass
    if errors:
        log("OBSERVED LOG HITS (possible issues):")
        for e in errors[:6]:
            log("  " + e)
    else:
        log("No obvious Error/Traceback/404 in captured logs (good sign)")

    log("VERIF RUN COMPLETE. See active-play-screenshot.png and browser-verif.log")
    print("Wrote evidence under", WO_DIR)

if __name__ == "__main__":
    main()
