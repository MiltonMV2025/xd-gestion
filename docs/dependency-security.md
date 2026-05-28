# Dependency Security

How this project defends against supply-chain attacks on npm packages (a malicious version published to a legitimate package, then yanked hours/days later once detected).

## What's in place

| File | Purpose |
|---|---|
| `package-lock.json` | Pins every resolved dep to an exact version + SHA-512 integrity hash. The source of truth. |
| `.npmrc` | Forces future `npm install <pkg>` to pin exact versions instead of caret ranges. |
| `scripts/audit-dep-ages.sh` | Flags any direct dep whose currently-resolved version was published less than N days ago. |

The defense rests on three rules:

1. **Install with `npm ci`, not `npm install`.** `npm ci` refuses to deviate from the lockfile and verifies each tarball's SHA-512 hash before extracting. `npm install` may silently rewrite the lockfile.
2. **Never adopt a freshly-published version.** A 7-day minimum age gives the community time to detect and yank a malicious release.
3. **Pin exact versions in `package.json`.** Caret ranges (`^1.2.3`) let any new patch/minor float in. `.npmrc` enforces this for new installs.

---

## `.npmrc` structure

The file lives at the project root and is read by `npm` automatically for any command run from this repo.

```ini
save-exact=true
```

### What each setting does

| Key | Value | Effect |
|---|---|---|
| `save-exact` | `true` | When you run `npm install <pkg>`, the entry written to `package.json` is exact (`"pkg": "1.2.3"`) instead of caret-prefixed (`"pkg": "^1.2.3"`). |

### Optional settings you might add later

These are **not** enabled by default — uncomment in `.npmrc` if you want stricter behavior:

| Key | Value | Effect |
|---|---|---|
| `engine-strict` | `true` | `npm` refuses to install if Node version doesn't match `engines.node` in `package.json`. Useful for CI. |
| `audit-level` | `high` | `npm install` fails if any dep has a `high` or `critical` advisory. |
| `fund` | `false` | Silences "consider funding" output. Quality-of-life only. |
| `package-lock` | `true` | Defaults to `true` already; set explicitly to prevent accidental disabling. |

---

## Using the audit script

`scripts/audit-dep-ages.sh` reads every direct dep from `package.json`, looks up the resolved version in `package-lock.json`, then queries `npm view <pkg>@<version> time` for the publish date.

### Run it

```bash
# Default: flag anything younger than 7 days
./scripts/audit-dep-ages.sh

# Custom threshold
MIN_AGE_DAYS=14 ./scripts/audit-dep-ages.sh
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | All direct deps are at least `MIN_AGE_DAYS` old. Safe. |
| `1` | One or more deps are too new. Output lists them. |
| `2` | `package.json` or `package-lock.json` not found. |

### Output

Prints a per-package table — name, resolved version, publish date, age in days, and `OK` / `TOO NEW`. Ends with a `PASS` or `FAIL` line.

### Hooking into CI (optional)

Drop this into your CI pipeline to fail builds that introduce a too-new dep:

```yaml
- run: ./scripts/audit-dep-ages.sh
```

---

## Daily workflow

### Installing dependencies (you, a teammate, or CI)

```bash
npm ci
```

Always `npm ci`. Never `npm install` for routine setup. `npm ci`:
- Reads `package-lock.json` exclusively.
- Verifies each tarball's SHA-512 integrity hash.
- Removes any existing `node_modules` for a clean slate.
- Refuses to run if `package.json` and `package-lock.json` are out of sync.

### Adding a new dependency

```bash
# 1. Check the version you intend to install
npm view <pkg> time --json | tail -10

# 2. Confirm the version you want is at least 7 days old.
#    If it isn't, install an older version explicitly:
npm install <pkg>@<exact-older-version>

# 3. (Or, if latest is old enough)
npm install <pkg>

# 4. Re-run the audit to confirm nothing else regressed
./scripts/audit-dep-ages.sh

# 5. Commit both package.json and package-lock.json
git add package.json package-lock.json
git commit -m "deps: add <pkg>@<version>"
```

Because `.npmrc` has `save-exact=true`, step 3 writes an exact version (no caret) to `package.json`. No manual editing needed.

### Bumping an existing dependency

```bash
# 1. Inspect available versions and dates
npm view <pkg> versions --json
npm view <pkg> time --json | tail -20

# 2. Pick a target version that is ≥7 days old
npm install <pkg>@<target-version>

# 3. Re-audit
./scripts/audit-dep-ages.sh
```

### Removing a dependency

```bash
npm uninstall <pkg>
git add package.json package-lock.json
```

---

## What this does **not** protect against

- **Typosquatting.** If you `npm install reactt` instead of `react`, none of these checks help. Read the name twice.
- **Already-installed malicious versions older than 7 days.** Once a bad version has been around long enough and nobody caught it, the age check is useless. Run `npm audit` periodically as a second layer.
- **Compromised transitive dependencies introduced by bumping a direct dep.** The audit script only checks the 20 direct deps. When you bump a direct dep, scan the resulting lockfile diff for unexpected new packages.
- **Local credential theft / postinstall scripts.** Consider `npm config set ignore-scripts true` for an even more paranoid setup (will break some packages — out of scope here).

---

## Quick reference

```bash
# routine install
npm ci

# audit
./scripts/audit-dep-ages.sh

# stricter audit (e.g. 14-day window)
MIN_AGE_DAYS=14 ./scripts/audit-dep-ages.sh

# add a new dep (auto-pinned exact via .npmrc)
npm install <pkg>
./scripts/audit-dep-ages.sh
```
