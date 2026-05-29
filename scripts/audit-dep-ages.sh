#!/usr/bin/env bash
# Audit direct dependencies in package-lock.json against an npm publish-date threshold.
# Flags any resolved version published less than MIN_AGE_DAYS ago — the supply-chain
# attack window where a malicious release would not yet have been reported/yanked.
#
# Usage:
#   ./scripts/audit-dep-ages.sh              # uses default 7-day threshold
#   MIN_AGE_DAYS=14 ./scripts/audit-dep-ages.sh
#
# Exit code: 0 if all deps clear the threshold, 1 if any are too new.

set -euo pipefail

MIN_AGE_DAYS="${MIN_AGE_DAYS:-7}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/package.json"
LOCK="$ROOT/package-lock.json"

if [[ ! -f "$PKG" || ! -f "$LOCK" ]]; then
  echo "error: package.json or package-lock.json not found at $ROOT" >&2
  exit 2
fi

python3 - "$PKG" "$LOCK" "$MIN_AGE_DAYS" <<'PY'
import json, subprocess, sys
from datetime import datetime, timezone

pkg_path, lock_path, min_age_days = sys.argv[1], sys.argv[2], int(sys.argv[3])

with open(pkg_path) as f:
    pkg = json.load(f)
with open(lock_path) as f:
    lock = json.load(f)

direct = list(pkg.get("dependencies", {}).keys()) + list(pkg.get("devDependencies", {}).keys())
packages = lock.get("packages", {})

now = datetime.now(timezone.utc)
flagged = []

print(f"{'Package':<35} {'Version':<14} {'Published':<12} {'Age':<8} {'Status'}")
print("-" * 85)

for name in direct:
    info = packages.get(f"node_modules/{name}", {})
    version = info.get("version")
    if not version:
        print(f"{name:<35} {'?':<14} {'?':<12} {'?':<8} MISSING")
        continue

    try:
        out = subprocess.check_output(
            ["npm", "view", f"{name}@{version}", "time", "--json"],
            stderr=subprocess.DEVNULL,
        )
        times = json.loads(out)
        date_str = times.get(version) if isinstance(times, dict) else None
    except subprocess.CalledProcessError:
        date_str = None

    if not date_str:
        print(f"{name:<35} {version:<14} {'?':<12} {'?':<8} LOOKUP_FAIL")
        continue

    pub = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    age = (now - pub).days
    status = "OK" if age >= min_age_days else "TOO NEW"
    if status == "TOO NEW":
        flagged.append((name, version, age))
    print(f"{name:<35} {version:<14} {pub.date().isoformat():<12} {age}d{'':<4} {status}")

print()
if flagged:
    print(f"FAIL: {len(flagged)} package(s) younger than {min_age_days} days:")
    for n, v, a in flagged:
        print(f"  - {n}@{v} ({a}d old)")
    sys.exit(1)
else:
    print(f"PASS: all direct deps are at least {min_age_days} days old.")
PY
