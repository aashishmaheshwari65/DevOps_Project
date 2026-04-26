#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Amazon Linux 2023 often ships buildx < 0.17; new Docker Compose needs ≥ 0.17.
# This downloads the latest official buildx binary into Docker's plugin path.
# Safe to run on every deploy (overwrites; ~ tens of MB per run).
# -----------------------------------------------------------------------------

set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker: not in PATH" >&2
  exit 1
fi

# Skip re-download if buildx is already 0.17+ (saves time on every push)
b=$(docker buildx version 2>/dev/null || true)
if echo "$b" | grep -qE 'v0\.(1[7-9]\.|[2-9][0-9]\.)|v0\.2[0-9]\.'; then
  echo "buildx OK: $b"
  exit 0
fi
echo "buildx missing or < 0.17; upgrading..."

UNAME_M=$(uname -m)
case "$UNAME_M" in
  x86_64)  DL_ARCH=amd64 ;;
  aarch64) DL_ARCH=arm64 ;;
  *) echo "Unsupported arch: $UNAME_M" >&2; exit 1 ;;
esac

URL="https://github.com/docker/buildx/releases/latest/download/docker-buildx-linux-${DL_ARCH}"
PLUGIN_DIR="/usr/libexec/docker/cli-plugins"
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi

$SUDO mkdir -p "$PLUGIN_DIR"
echo "Installing/updating Docker Buildx: $URL"
curl -fSL "$URL" -o /tmp/docker-buildx-bin
$SUDO install -m 0755 /tmp/docker-buildx-bin "$PLUGIN_DIR/docker-buildx"
rm -f /tmp/docker-buildx-bin
docker buildx version
