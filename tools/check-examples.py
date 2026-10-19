#!/usr/bin/env python3
"""Compile and run standalone examples with strict warnings and bounded execution."""

import argparse
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sanitize', action='store_true',
                        help='enable AddressSanitizer and UndefinedBehaviorSanitizer')
    args = parser.parse_args()
    sources = sorted((ROOT / 'examples').glob('day-*/*.cpp'))
    sources += sorted((ROOT / 'examples').glob('*.cpp'))
    if not sources:
        print('No standalone C++ examples found.', file=sys.stderr)
        return 1
    compiler = shlex.split(os.environ.get('CXX', 'g++'))
    flags = ['-std=c++23', '-Wall', '-Wextra', '-Wconversion', '-Wpedantic', '-Werror']
    if args.sanitize:
        flags += ['-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer',
                  '-fno-sanitize-recover=all']
    failures = 0
    with tempfile.TemporaryDirectory(prefix='cpp-examples-') as build_dir:
        for index, source in enumerate(sources):
            name = str(source.relative_to(ROOT))
            output = str(Path(build_dir) / str(index))
            try:
                subprocess.run(compiler + flags + [str(source), '-o', output],
                               cwd=ROOT, check=True, timeout=60)
                subprocess.run([output], cwd=ROOT, check=True, timeout=10,
                               stdout=subprocess.DEVNULL)
                print(f'PASS {name}', flush=True)
            except (subprocess.SubprocessError, OSError) as error:
                failures += 1
                print(f'FAIL {name}: {error}', file=sys.stderr, flush=True)
    print(f'{len(sources)} examples checked; {failures} failed.')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
