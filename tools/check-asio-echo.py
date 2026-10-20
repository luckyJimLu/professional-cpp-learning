#!/usr/bin/env python3
"""Bounded loopback smoke tests for the three native Standalone Asio examples.

This checks binary echo, fragmented input and reconnect, not graceful shutdown,
backpressure, cancellation races, TLS or hard real-time behavior.
"""

import argparse
from pathlib import Path
import socket
import subprocess
import tempfile
import time


def connect(port: int, process: subprocess.Popen, deadline: float) -> socket.socket:
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"server exited during startup: {process.returncode}")
        try:
            return socket.create_connection(("127.0.0.1", port), timeout=0.2)
        except (ConnectionError, TimeoutError, OSError):
            time.sleep(0.03)
    raise TimeoutError("server did not accept a loopback connection before deadline")


def check(binary: Path) -> None:
    # Select an ephemeral port; if another process wins the bind race the
    # server's failure is reported rather than assuming a fixed port is free.
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        port = reservation.getsockname()[1]
    with tempfile.TemporaryFile(mode="w+t") as log:
        process = subprocess.Popen([str(binary), str(port)], stdout=log,
                                   stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 15
            payloads = [b"AT\x00" + bytes(range(256)) * 8, b"second connection\r\n"]
            for payload in payloads:
                with connect(port, process, min(deadline, time.monotonic() + 5)) as client:
                    for chunk in (payload[:1], payload[1:19], payload[19:]):
                        if not chunk:
                            continue
                        client.settimeout(max(0.01, min(2, deadline - time.monotonic())))
                        client.sendall(chunk)
                        received = bytearray()
                        while len(received) < len(chunk):
                            remaining = deadline - time.monotonic()
                            if remaining <= 0:
                                raise TimeoutError("echo exceeded test deadline")
                            client.settimeout(min(2, remaining))
                            part = client.recv(len(chunk) - len(received))
                            if not part:
                                raise RuntimeError("connection closed before full echo")
                            received.extend(part)
                        if received != chunk:
                            raise RuntimeError("echo bytes differ from submitted fragment")
                if process.poll() is not None:
                    raise RuntimeError("server exited before reconnect could be verified")
        except Exception:
            log.seek(0)
            print(log.read(2000))
            raise
        finally:
            # Process termination is fixture cleanup, not a graceful-close test.
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bin-dir", required=True, type=Path)
    args = parser.parse_args()
    failures = 0
    for name in ("01_sync_tcp_echo", "02_async_tcp_echo", "03_coroutine_echo"):
        binary = (args.bin_dir / name).resolve()
        if not binary.is_file():
            binary = binary.with_suffix(".exe")
        try:
            check(binary)
            print(f"PASS {name}: binary fragments and reconnect")
        except (OSError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
            failures += 1
            print(f"FAIL {name}: {error}")
    print(f"3 Asio examples checked; {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
