"""Exercise real loopback TCP, without sleeps or a hard-coded port."""
import concurrent.futures
import socket
import subprocess
import sys

server = subprocess.Popen([sys.argv[1], "3"], stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True)
try:
    # Bound readiness too, so a broken startup cannot hang CI.
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ready:
        try:
            line = ready.submit(server.stdout.readline).result(timeout=5)
        except concurrent.futures.TimeoutError:
            server.kill()  # Unblock readline before the executor joins.
            raise
    if not line.startswith("PORT "):
        server.kill()
        out, err = server.communicate()
        raise AssertionError(f"Server startup failed: {line}{out}{err}")
    port = int(line.split()[1])
    payloads = [b"hello\x00asio\xff", bytes(range(256)) * 1024, b""]
    clients = [socket.create_connection(("127.0.0.1", port), timeout=5)
               for _ in payloads]

    def exchange(pair):
        client, payload = pair
        with client:
            # A separate writer avoids deadlock for payloads larger than buffers.
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as writer:
                def send():
                    # Deliberately split data; TCP does not preserve writes.
                    for start in range(0, len(payload), 997):
                        client.sendall(payload[start:start + 997])
                    client.shutdown(socket.SHUT_WR)
                sent = writer.submit(send)
                output = bytearray()
                while chunk := client.recv(2048):
                    output.extend(chunk)
                sent.result(timeout=5)
            assert bytes(output) == payload, (len(output), len(payload))

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as parallel:
        list(parallel.map(exchange, zip(clients, payloads)))
    out, err = server.communicate(timeout=5)
    assert server.returncode == 0, err
    assert "3 sessions drained" in out, out
    print("PASS TCP: binary data, fragmented writes, 256 KiB stream, concurrent sessions, empty stream, EOF and natural drain")
finally:
    if server.poll() is None:
        server.kill()
    server.communicate()
