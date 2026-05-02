# Installing CableJack on an LG TV

These steps walk through sideloading the CableJack app onto an LG Smart TV (webOS).
You will need a Windows or Mac computer on the same network as your TV.

---

## Step 1 — Enable developer mode on the TV

1. On your TV, open the **LG Content Store** (press the Home button, then find the store)
2. Search for **Developer Mode** and install the app
3. Open the Developer Mode app and sign in with your LG developer account
   - Create one free at https://webostv.developer.lge.com if you don't have one
4. Toggle **Dev Mode Status** to **On** — the TV will restart
5. After restart, open the Developer Mode app again and note the **Passphrase** shown on screen (you'll need it in Step 3)

---

## Step 2 — Install ares-cli

`ares-cli` is the LG command-line tool for packaging and installing webOS apps.

```
npm install -g @webosose/ares-cli
```

Node.js must be installed first. Download it from https://nodejs.org if needed.

---

## Step 3 — Register your TV

Run the setup wizard to add your TV as a known device:

```
ares-setup-device
```

Select **add** and fill in the details when prompted:

| Field | Value |
|---|---|
| Device name | Any name you want (e.g. `living-room`) |
| IP address | Your TV's IP address |
| Port | `9922` |
| Username | `prisoner` |
| Authentication | `password` |
| Password | The passphrase shown in the Developer Mode app (Step 1) |

To find your TV's IP address: **Settings** → **Network** → **Wi-Fi Connection** → **Advanced Wi-Fi Settings**.

Confirm the connection worked:

```
ares-device-info --device <device-name>
```

---

## Step 4 — Install the app

```
ares-install --device <device-name> tv.cablejack.app_1.0.0_all.ipk
```

If successful you will see `Installing package` followed by `Success` in the output.

---

## Step 5 — Launch the app

CableJack will now appear in your TV's app list. You can also launch it from the terminal:

```
ares-launch --device <device-name> tv.cablejack.app
```

---

## Troubleshooting

**`ares-setup-device` connection fails**
Make sure your computer and TV are on the same Wi-Fi network and that developer
mode is active. The Developer Mode app shows a session timer — if it expires,
toggle Dev Mode off and back on to get a fresh passphrase.

**`ares-cli` command not found**
Make sure npm's global bin directory is on your PATH. Run `npm bin -g` to find
the path and add it to your shell profile.

**`ares-install` fails with "Unknown error"**
The developer mode session may have expired (it resets every 50 hours). Re-enable
it in the Developer Mode app and run `ares-setup-device` again with the new
passphrase.

**App does not load / shows a blank screen**
Make sure your TV can reach `https://cablejack.tv`. Check **Settings** →
**Network** to confirm the TV is connected to the internet.
