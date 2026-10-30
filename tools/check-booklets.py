#!/usr/bin/env python3
"""Validate both booklet structures and run complete C17/C++ examples."""
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / "booklets/c.md").read_text(encoding="utf-8")
entries = re.findall(r"^### .+ <!-- entry: ([a-z0-9-]+) -->$", source, re.M)
categories = re.findall(r"^## .+ <!-- category: ([a-z-]+) -->$", source, re.M)
if not entries or len(entries) != len(set(entries)):
    raise SystemExit("Missing or duplicate booklet entry IDs")
if not categories or len(categories) != len(set(categories)):
    raise SystemExit("Missing or duplicate booklet category IDs")
if len(re.findall(r"^关键词：.+$", source, re.M)) != len(entries):
    raise SystemExit("Every entry must supply search keywords")
if len(re.findall(r"^### ", source, re.M)) != len(entries):
    raise SystemExit("Every level-three heading must have a stable entry ID")
if len(re.findall(r"^```", source, re.M)) % 2:
    raise SystemExit("Unbalanced code fences")
# Both language booklets keep independent stable IDs and search keywords.
cpp_source = (ROOT / "booklets/cpp.md").read_text(encoding="utf-8")
cpp_entries = re.findall(r"^### .+ <!-- entry: ([a-z0-9-]+) -->$", cpp_source, re.M)
cpp_categories = re.findall(r"^## .+ <!-- category: ([a-z0-9-]+) -->$", cpp_source, re.M)
if not cpp_entries or len(cpp_entries) != len(set(cpp_entries)):
    raise SystemExit("Missing or duplicate C++ booklet entry IDs")
if not cpp_categories or len(cpp_categories) != len(set(cpp_categories)):
    raise SystemExit("Missing or duplicate C++ booklet category IDs")
if len(re.findall(r"^关键词：.+$", cpp_source, re.M)) != len(cpp_entries):
    raise SystemExit("Every C++ entry must supply search keywords")
if len(re.findall(r"^### ", cpp_source, re.M)) != len(cpp_entries):
    raise SystemExit("Every C++ entry must have a stable ID")
if len(re.findall(r"^```", cpp_source, re.M)) % 2:
    raise SystemExit("Unbalanced C++ code fences")
for version in ("11", "14", "17", "20", "23"):
    if f"cpp-{version}" not in cpp_categories:
        raise SystemExit(f"Missing C++{version} chapter")
# Modern-feature explanations must include the problem, scenario and usage limits.
feature_blocks = re.findall(r"^### [^\n]+ <!-- entry: (feature-\d+) -->\n(.*?)(?=^### |^## |\Z)", cpp_source, re.M | re.S)
if not feature_blocks:
    raise SystemExit("Missing C++ standard-version feature explanations")
for feature_id, body in feature_blocks:
    for label in ("**首次标准化：", "**引入原因：**", "**应用场景：**", "**使用边界：**", "**实现机制（标准要求与常见实现）：**", "**深入讨论：**"):
        if label not in body:
            raise SystemExit(f"{feature_id} is missing {label}")
print(f"C++ feature context PASS: {len(feature_blocks)} versioned entries")
print(f"C++ structure PASS: {len(cpp_categories)} categories, {len(cpp_entries)} entries")
# Validate the promised C17 index and keyword inventory, not just page length.
header_entry = source.split("<!-- entry: standard-headers -->", 1)[1].split("\n### ", 1)[0]
headers = set(re.findall(r"`<([a-z0-9]+\.h)>`", header_entry))
expected_headers = set("assert.h complex.h ctype.h errno.h fenv.h float.h inttypes.h iso646.h limits.h locale.h math.h setjmp.h signal.h stdalign.h stdarg.h stdatomic.h stdbool.h stddef.h stdint.h stdio.h stdlib.h stdnoreturn.h string.h tgmath.h threads.h time.h uchar.h wchar.h wctype.h".split())
if headers != expected_headers:
    raise SystemExit(f"C17 header index mismatch: {headers ^ expected_headers}")
keyword_entry = source.split("<!-- entry: keywords -->", 1)[1].split("\n### ", 1)[0]
keywords = re.search(r"```text\n(.*?)```", keyword_entry, re.S).group(1).split()
expected_keywords = set("auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while inline restrict _Bool _Complex _Imaginary _Alignas _Alignof _Atomic _Generic _Noreturn _Static_assert _Thread_local".split())
if len(keywords) != 44 or set(keywords) != expected_keywords:
    raise SystemExit("C17 keyword inventory does not match its 44 standard keywords")
programs = [block for block in re.findall(r"^```c\n([\s\S]*?)^```", source, re.M)
            if re.search(r"\bint main\s*\(", block)]
compiler = shlex.split(os.environ.get("CC", "gcc"))
flags = ["-std=c17", "-Wall", "-Wextra", "-Wconversion", "-Wpedantic", "-Werror"]
with tempfile.TemporaryDirectory(prefix="c-booklet-") as temporary:
    directory = Path(temporary)
    files = []
    for index, program in enumerate(programs):
        path = directory / f"program-{index}.c"
        path.write_text(program, encoding="utf-8")
        files.append(path)
    files += sorted((ROOT / "booklets/examples").glob("*.c"))
    files += sorted((ROOT / "booklets/labs").glob("*.c"))
    for index, path in enumerate(files):
        binary = directory / f"example-{index}"
        subprocess.run(compiler + flags + [str(path), "-o", str(binary), "-lm"], check=True, timeout=30)
        subprocess.run([str(binary)], check=True, timeout=10)
print(f"PASS: {len(categories)} categories, {len(entries)} entries, {len(programs)} complete inline programs and {len(files) - len(programs)} C17 reference program(s).")
print("Context-dependent syntax fragments are not claimed to be standalone programs.")

cpp_compiler = shlex.split(os.environ.get("CXX", "g++"))
cpp_programs = [block for block in re.findall(r"^```cpp\n([\s\S]*?)^```", cpp_source, re.M)
                if re.search(r"\bint main\s*\(", block)]
with tempfile.TemporaryDirectory(prefix="cpp-booklet-") as temporary:
    directory = Path(temporary)
    cpp_files = []
    for index, program in enumerate(cpp_programs):
        path = directory / f"inline-{index}.cpp"
        path.write_text(program, encoding="utf-8")
        cpp_files.append((path, "c++20"))
    cpp_files += [(path, "c++23" if path.name.startswith("cpp23-") else "c++20")
                  for path in sorted((ROOT / "booklets/examples").glob("*.cpp"))]
    cpp_files += [(path, "c++20") for path in sorted((ROOT / "booklets/labs").glob("*.cpp"))]
    for index, (path, standard) in enumerate(cpp_files):
        binary = directory / f"cpp-example-{index}"
        subprocess.run(cpp_compiler + [f"-std={standard}", "-Wall", "-Wextra", "-Wconversion", "-Wpedantic", "-Werror", "-pthread", str(path), "-o", str(binary)], check=True, timeout=60)
        subprocess.run([str(binary), str(directory / f"io-{index}.txt")], check=True, timeout=15)
print(f"C++ PASS: {len(cpp_programs)} complete inline program(s), {len(cpp_files) - len(cpp_programs)} standalone C++20/C++23 reference program(s).")
print("Modules, format/print and platform-specific facilities are not claimed to be tested by these host examples.")
