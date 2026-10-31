# Biometric Data: Troubleshooting on the VPS

Use this guide when biometric pages (Daily, Monthly, Muster) work locally but fail on the VPS.

## How biometric data flows

"Biometric" here means attendance punch logs, not fingerprint login. Nothing in the browser touches biometric hardware, so HTTPS, WebAuthn and browser security settings are not involved.

```
Browser (React) ──> Node API /api/biometric/* ──> Remote MySQL 210.212.207.11:3306
                                                   database: biometric_data
                                                   tables:   DeviceLogs_<month>_<year>, devices, employees
```

Code: `server/src/services/biometric.service.js` and `server/src/jobs/ScheduledJobs.js`.
Settings: the `DB_SECONDARY_*` values in `server/.env`.

If the VPS can't reach that MySQL server, every biometric page fails.

---

## Quick diagnosis (run on the VPS)

```bash
curl -4 ifconfig.me                       # VPS public IP (needed for the fixes below)
nc -vz -w 5 210.212.207.11 3306           # can we reach the port?
nc -vz -w 5 portquiz.net 3306             # does the VPS allow outgoing 3306 at all?
mysql -h 210.212.207.11 -u <user> -p biometric_data -e "SELECT 1;"
pm2 env <id> | grep -E "DB_SECONDARY|TZ"  # env the running app actually has
pm2 logs <app> --lines 100                # real error from the server
date; node -e "console.log(new Date().toString())"
```

| What you see | Cause | Fix |
|---|---|---|
| `nc` times out / `ETIMEDOUT` | Firewall blocks port 3306 | [Fix 2](#fix-2-open-the-firewall-for-port-3306) |
| `ECONNREFUSED 210.212.207.11` | MySQL is listening only on the server itself | [Fix 2, Step 3](#step-3-biometric-server-side-on-21021220711) |
| `Access denied` / `Host '…' is not allowed to connect` | MySQL user not allowed from the VPS IP | [Fix 1](#fix-1-allow-the-vps-ip-in-mysql) |
| `ECONNREFUSED 127.0.0.1:3306` | `DB_SECONDARY_*` missing on the VPS | [Fix 3](#fix-3-environment-variables-on-the-vps) |
| Page loads but data is empty or from the wrong day | VPS runs in UTC | [Fix 4](#fix-4-timezone) |
| 404, or HTML instead of JSON | Nginx proxy or frontend build settings | [Fix 5](#fix-5-frontend-build-and-proxy) |

In the browser, open DevTools → Network and click the failing `/api/biometric/...` request to see its status and response.

---

## Fix 1: Allow the VPS IP in MySQL

MySQL accounts are tied to the address they connect from. If the current user was created for another host's IP, it rejects logins from the VPS. Run this on the biometric MySQL server:

```sql
CREATE USER 'biometric_vps'@'<VPS_IP>' IDENTIFIED BY '<strong-password>';
GRANT SELECT ON biometric_data.* TO 'biometric_vps'@'<VPS_IP>';
FLUSH PRIVILEGES;
```

Put the new username and password in the VPS `server/.env`.

## Fix 2: Open the firewall for port 3306

Allow **only the VPS IP**. Never open 3306 to the whole internet.

### Step 1: Confirm it's the firewall
If `nc -vz 210.212.207.11 3306` times out, something is dropping the traffic.

### Step 2: VPS side (only if `portquiz.net 3306` also failed)
```bash
sudo ufw status
sudo ufw allow out 3306/tcp
```
Also check your VPS provider's control panel for a firewall or "security group" that blocks outgoing traffic.

### Step 3: Biometric server side (on 210.212.207.11)

Linux with ufw:
```bash
sudo ufw allow from <VPS_IP> to any port 3306 proto tcp
```

Linux with firewalld:
```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<VPS_IP>" port port="3306" protocol="tcp" accept'
sudo firewall-cmd --reload
```

Windows (admin PowerShell):
```powershell
New-NetFirewallRule -DisplayName "MySQL from VPS" -Direction Inbound -Protocol TCP -LocalPort 3306 -RemoteAddress <VPS_IP> -Action Allow
```

Make sure MySQL listens on the network. In `my.cnf` (Linux) or `my.ini` (Windows):
```
bind-address = 0.0.0.0
```
Restart MySQL after changing it.

### Step 4: Campus firewall or router
If the server sits behind the college firewall (FortiGate, Sophos, etc.), ask the network admin to add:

> Allow TCP 3306 from `<VPS_IP>` to the biometric server.

### Step 5: Verify (on the VPS)
```bash
nc -vz 210.212.207.11 3306
mysql -h 210.212.207.11 -u biometric_vps -p biometric_data -e "SELECT 1;"
```

### If port 3306 can't be opened: use an SSH tunnel
This only needs SSH (port 22) open to the biometric server, and the traffic is encrypted.
```bash
ssh -f -N -L 3307:127.0.0.1:3306 user@210.212.207.11
```
Then set the following in the VPS `server/.env`:
```
DB_SECONDARY_HOST=127.0.0.1
DB_SECONDARY_PORT=3307
```
Use `autossh` so the tunnel restarts automatically when it drops.

## Fix 3: Environment variables on the VPS

If `DB_SECONDARY_*` is missing, the code silently falls back to `127.0.0.1` / `root` / no password. Make sure the VPS `server/.env` has:

```
DB_SECONDARY_HOST=210.212.207.11
DB_SECONDARY_PORT=3306
DB_SECONDARY_DATABASE=biometric_data
DB_SECONDARY_USERNAME=<user>
DB_SECONDARY_PASSWORD=<password>
```

Then reload the app so it picks up the changes:
```bash
pm2 restart <app> --update-env
```

## Fix 4: Timezone

The code builds table names (`DeviceLogs_<month>_<year>`) and dates from server local time. A VPS usually runs in UTC, so between 00:00 and 05:30 IST, and around month changes, it queries the wrong day or the wrong table.

```bash
sudo timedatectl set-timezone Asia/Kolkata
```
Or add `TZ=Asia/Kolkata` to the PM2 config or `.env`, then run `pm2 restart <app> --update-env`.

## Fix 5: Frontend build and proxy

- Vite reads `VITE_*` variables when it builds, not when the page runs. Rebuild the client with the API URL set for the VPS, not `localhost`.
- Make sure Nginx forwards `/api/` to the Node server.
- If the frontend and API are on different domains, add the VPS domain to the server's CORS settings.

---

## Recommended code improvements

- Add `connectTimeout: 5000` to `SECONDARY_DB` in `biometric.service.js` and `ScheduledJobs.js`. Then an unreachable database fails fast instead of hanging.
- Log the MySQL error code (`ETIMEDOUT`, `ER_ACCESS_DENIED_ERROR`, …) so the cause shows up in `pm2 logs`.
- Use one shared MySQL connection pool instead of creating a new one on every request.
