#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Ninja Dashboard deploy script
# Syncs the git repo, writes production env vars, builds the SPA and publishes
# the static bundle to Nginx's document root.
# -----------------------------------------------------------------------------

BRANCH="${1:-main}"
REPO_URL="https://github.com/carlosSepher/ninja-dashboard-web.git"
DEPLOY_ROOT="/opt/ninja-dashboard-web"
REPO_DIR="$DEPLOY_ROOT/repo"
ENV_FILE="$REPO_DIR/.env.prod"
DEPLOY_DIR="/var/www/dashboard"
NPM_BIN="${NPM_BIN:-npm}"
NGINX_SERVICE="nginx"
WWW_USER="www-data"
WWW_GROUP="www-data"

# --- Production tokens -------------------------------------------------------
EXEC_API_TOKEN="SeQenp_Y5M4yQOHjqGTW7Z0pZdZpmo-FrFh1i73sXPg"
PAYMENTS_API_TOKEN="19e188001a856df90fa0d31a2076c1d78b7c1c0bba00e7341c332b2a8097e8ac"
CONCILIATOR_TOKEN="de87vjwr-0dMw4R3L3fb1VeSG6RcA3nPldqkByx-aCY"

# -----------------------------------------------------------------------------

info() {
  printf '\033[1;34m[INFO]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[WARN]\033[0m %s\n' "$*"
}

error() {
  printf '\033[1;31m[ERR]\033[0m %s\n' "$*" >&2
  exit 1
}

ensure_layout() {
  sudo mkdir -p "$DEPLOY_ROOT"
  sudo chown -R "$USER":"$USER" "$DEPLOY_ROOT"
  mkdir -p "$REPO_DIR"
}

sync_repo() {
  if [[ -d "$REPO_DIR/.git" ]]; then
    info "Actualizando repositorio en $REPO_DIR"
    git -C "$REPO_DIR" fetch --all --prune
    git -C "$REPO_DIR" checkout "$BRANCH"
    git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
  else
    info "Clonando repositorio en $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR"
    git -C "$REPO_DIR" checkout "$BRANCH"
  fi
}

write_env() {
  info "Generando archivo de entorno $ENV_FILE"
  cat <<EOF >"$ENV_FILE"
VITE_API_BASE_URL=https://pago.emprende.cl/executive/api/v1
VITE_API_TOKEN=$EXEC_API_TOKEN
VITE_ENABLE_MSW=false
VITE_FEATURE_FLAGS=export-csv
VITE_EXECUTIVE_HEALTH_URL=https://pago.emprende.cl/executive/api/v1/health/metrics
VITE_EXECUTIVE_HEALTH_TOKEN=$EXEC_API_TOKEN
VITE_EXECUTIVE_SERVICE_NAME=Executive API
VITE_PAYMENTS_HEALTH_URL=https://pago.emprende.cl/health/metrics
VITE_PAYMENTS_API_BASE_URL=https://pago.emprende.cl/api
VITE_PAYMENTS_HEALTH_TOKEN=
VITE_PAYMENTS_API_TOKEN=$PAYMENTS_API_TOKEN
VITE_PAYMENTS_SERVICE_NAME=Payments API
VITE_CONCILIATOR_HEALTH_URL=/conciliator-health
VITE_CONCILIATOR_HEALTH_TOKEN=$CONCILIATOR_TOKEN
VITE_CONCILIATOR_SERVICE_NAME=Conciliator
VITE_CONCILIATOR_HEALTH_TARGET=http://127.0.0.1:8300
VITE_CONCILIATOR_HEALTH_PATH=/api/v1/health/metrics

VITE_DASHBOARD_DATA_REFRESH_ENABLED=false
VITE_DASHBOARD_DATA_REFRESH_INTERVAL_MS=15000
VITE_DASHBOARD_HEALTH_REFRESH_ENABLED=true
VITE_DASHBOARD_HEALTH_REFRESH_INTERVAL_MS=10000
EOF
}

install_dependencies() {
  info "Instalando dependencias npm"
  (cd "$REPO_DIR" && $NPM_BIN ci)
}

build_assets() {
  info "Generando build de producción"
  (cd "$REPO_DIR" && $NPM_BIN run build -- --mode prod)
}

deploy_assets() {
  info "Sincronizando dist/ con $DEPLOY_DIR"
  sudo mkdir -p "$DEPLOY_DIR"
  sudo rsync -a --delete "$REPO_DIR/dist/" "$DEPLOY_DIR/"
  sudo chown -R "$WWW_USER":"$WWW_GROUP" "$DEPLOY_DIR"
}

reload_nginx() {
  info "Recargando $NGINX_SERVICE"
  sudo systemctl reload "$NGINX_SERVICE"
}

main() {
  ensure_layout
  sync_repo
  write_env
  install_dependencies
  build_assets
  deploy_assets
  reload_nginx
  info "Deploy completado. Revisá https://pago.emprende.cl/dashboard/"
}

main "$@"
