#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Amazon Linux 2023 often ships buildx < 0.17; new Docker Compose needs ≥ 0.17.
# Official release files are named e.g. buildx-v0.20.0.linux-amd64 (not docker-buildx-linux-amd64).
# Pin a version >= 0.17; bump occasionally for security.
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

# v0.20.0+ satisfies Compose; override with BUILDX_TAG when testing newer releases
BUILDX_TAG="${BUILDX_TAG:-v0.20.0}"
URL="https://github.com/docker/buildx/releases/download/${BUILDX_TAG}/buildx-${BUILDX_TAG}.linux-${DL_ARCH}"
PLUGIN_DIR="/usr/libexec/docker/cli-plugins"
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi

$SUDO mkdir -p "$PLUGIN_DIR"
echo "Installing/updating Docker Buildx: $URL"
curl -fSL "$URL" -o /tmp/docker-buildx-bin
# Plugin binary name must be docker-buildx; release file is e.g. buildx-v0.20.0.linux-amd64
$SUDO install -m 0755 /tmp/docker-buildx-bin "$PLUGIN_DIR/docker-buildx"
rm -f /tmp/docker-buildx-bin
docker buildx version
