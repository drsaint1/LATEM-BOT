You reached the start of the range
Aug 31, 2025, 12:27 PM

# [Region: europe-west4]

# Using Detected Dockerfile

context: z0cq-h2TI

internal
load build definition from Dockerfile
0ms

internal
load metadata for docker.io/library/node:18-alpine
1s

auth
library/node:pull token for registry-1.docker.io
0ms

internal
load .dockerignore
0ms

1
FROM docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
6ms

internal
load build context
0ms

2
WORKDIR /app
111ms

3
COPY package\*.json ./
17ms

4
RUN npm ci --only=production
1s
npm warn config only Use `--omit=dev` to omit dev dependencies from the install.
npm error code EUSAGE
npm error
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.

npm error
npm error Missing: cross-env@7.0.3 from lock file

npm error Missing: qrcode@1.5.4 from lock file

npm error Missing: cross-spawn@7.0.6 from lock file

npm error Missing: path-key@3.1.1 from lock file

npm error Missing: shebang-command@2.0.0 from lock file

npm error Missing: dijkstrajs@1.0.3 from lock file

npm error Missing: pngjs@5.0.0 from lock file

npm error Missing: yargs@15.4.1 from lock file

npm error Missing: shebang-regex@3.0.0 from lock file

npm error Missing: cliui@6.0.0 from lock file

npm error Missing: decamelize@1.2.0 from lock file

npm error Missing: find-up@4.1.0 from lock file

npm error Missing: get-caller-file@2.0.5 from lock file

npm error Missing: require-directory@2.1.1 from lock file

npm error Missing: require-main-filename@2.0.0 from lock file

npm error Missing: which-module@2.0.1 from lock file

npm error Missing: y18n@4.0.3 from lock file

npm error Missing: yargs-parser@18.1.3 from lock file

npm error Missing: wrap-ansi@6.2.0 from lock file

npm error Missing: locate-path@5.0.0 from lock file

npm error Missing: path-exists@4.0.0 from lock file

npm error Missing: p-locate@4.1.0 from lock file

npm error Missing: p-limit@2.3.0 from lock file

npm error Missing: p-try@2.2.0 from lock file

npm error Missing: ansi-styles@4.3.0 from lock file

npm error Missing: color-convert@2.0.1 from lock file

npm error Missing: color-name@1.1.4 from lock file

npm error Missing: camelcase@5.3.1 from lock file

npm error
npm error Clean install a project
npm error
npm error Usage:
npm error npm ci
npm error
npm error Options:
npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
npm error [--no-bin-links] [--no-fund] [--dry-run]
npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
npm error
npm error aliases: clean-install, ic, install-clean, isntall-clean
npm error
npm error Run "npm help ci" for more info
npm notice
npm notice New major version of npm available! 10.8.2 -> 11.5.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.5.2
npm notice To update run: npm install -g npm@11.5.2
npm notice
npm error A complete log of this run can be found in: /root/.npm/\_logs/2025-08-31T11_28_04_344Z-debug-0.log
Dockerfile:6

---

4 |
5 | COPY package\*.json ./
6 | >>> RUN npm ci --only=production
7 |
8 | COPY src/ ./src/

---

ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci --only=production" did not complete successfully: exit code: 1
