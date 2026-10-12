# Deploying gin-console

The console runs as a systemd user service on `127.0.0.1:8700` and is exposed to the tailnet
only through `tailscale serve`.

## Install

```bash
mkdir -p ~/.config/gin-console ~/.config/systemd/user
cp config.example.yaml ~/.config/gin-console/config.yaml   # then edit the project list
uv --directory backend sync --frozen
pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build
cp deploy/gin-console.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now gin-console
sudo loginctl enable-linger gin
```

## Update

```bash
git pull
uv --directory backend sync --frozen
pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build
systemctl --user restart gin-console
```

## Tailscale

```bash
tailscale serve --bg --https=8443 http://127.0.0.1:8700
tailscale serve --https=443 --set-path=/bd off     # remove the redundant /bd path
tailscale serve status
```

Prefix with `sudo` if your user is not the Tailscale operator. Scotty stays at `/`.

## Logs

```bash
journalctl --user -u gin-console -f
```
