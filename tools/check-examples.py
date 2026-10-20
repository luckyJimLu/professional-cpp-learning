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
    parser.add_argument('--patterns-only', action='store_true',
                        help='check only the book-based C++17 design pattern examples')
    args = parser.parse_args()
    pattern_sources = sorted((ROOT / 'patterns' / 'examples').glob('*/*.cpp'))
    sources = [] if args.patterns_only else sorted((ROOT / 'examples').glob('day-*/*.cpp'))
    if not args.patterns_only:
        sources += sorted((ROOT / 'examples').glob('*.cpp'))
    sources += pattern_sources
    if not sources:
        print('No standalone C++ examples found.', file=sys.stderr)
        return 1
    compiler = shlex.split(os.environ.get('CXX', 'g++'))
    flags = ['-std=c++23', '-Wall', '-Wextra', '-Wconversion', '-Wpedantic', '-Werror']
    if args.sanitize:
        flags += ['-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer',
                  '-fno-sanitize-recover=all']
    # A main.cpp can accidentally mask missing header dependencies. Check each
    # course header in isolation and include it twice to exercise its guard.
    headers = [] if args.patterns_only else sorted((ROOT / 'examples').glob('day-*/*.hpp'))
    if not args.patterns_only:
        headers += sorted((ROOT / 'examples').glob('day-*/*.h'))
    failures = 0
    with tempfile.TemporaryDirectory(prefix='cpp-examples-') as build_dir:
        for index, source in enumerate(sources):
            name = str(source.relative_to(ROOT))
            output = str(Path(build_dir) / str(index))
            # Keep these book adaptations runnable with their documented C++17 baseline.
            source_flags = flags
            if source in pattern_sources:
                source_flags = ['-std=c++17', *flags[1:], '-pthread']
            try:
                subprocess.run(compiler + source_flags + [str(source), '-o', output],
                               cwd=ROOT, check=True, timeout=60)
                subprocess.run([output], cwd=ROOT, check=True, timeout=10,
                               stdout=subprocess.DEVNULL)
                print(f'PASS {name}', flush=True)
            except (subprocess.SubprocessError, OSError) as error:
                failures += 1
                print(f'FAIL {name}: {error}', file=sys.stderr, flush=True)
        for index, header in enumerate(headers):
            name = str(header.relative_to(ROOT))
            probe = Path(build_dir) / f'header-{index}.cpp'
            probe.write_text(f'#include "{header.as_posix()}"\n' * 2, encoding='utf-8')
            try:
                subprocess.run(compiler + flags + ['-fsyntax-only', str(probe)],
                               cwd=ROOT, check=True, timeout=60)
                print(f'PASS {name} (self-contained, repeated inclusion)', flush=True)
            except (subprocess.SubprocessError, OSError) as error:
                failures += 1
                print(f'FAIL {name}: {error}', file=sys.stderr, flush=True)
    print(f'{len(sources)} examples and {len(headers)} headers checked; {failures} failed.')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
