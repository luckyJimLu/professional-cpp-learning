#!/usr/bin/env python3
from __future__ import annotations

import sys
import zipfile
from pathlib import Path


def clean(path: Path) -> None:
    tmp = path.with_suffix(path.suffix + ".cleaning")
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w") as zout:
        for info in zin.infolist():
            if info.filename.endswith("/"):
                continue
            data = zin.read(info.filename)
            zout.writestr(info, data, compress_type=info.compress_type)
    tmp.replace(path)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: clean-pptx.py FILE.pptx [FILE.pptx ...]", file=sys.stderr)
        return 1
    for arg in sys.argv[1:]:
        path = Path(arg)
        if not path.is_file():
            print(f"not a file: {path}", file=sys.stderr)
            return 1
        clean(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
