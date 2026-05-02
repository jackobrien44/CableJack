# Installing CableJack on a Samsung TV

These steps walk through sideloading the CableJack app onto a Samsung Smart TV.
You will need a Windows or Mac computer on the same network as your TV.

---

## Step 1 — Enable developer mode on the TV

1. On your TV, open **Settings** (gear icon on the remote)
2. Navigate to **General** → **System Manager** → **Developer Mode**
   - On newer TVs (2023+) this may be under **General & Privacy** → **System Manager**
3. Toggle Developer Mode **On**
4. Enter the IP address of your computer when prompted
5. The TV will restart — developer mode is now active

To find your computer's IP address:
- **Windows:** open Command Prompt and run `ipconfig`, look for **IPv4 Address**
- **Mac:** open Terminal and run `ipconfig getifaddr en0`

---

## Step 2 — Install Tizen Studio

Download and install **Tizen Studio** from the official Samsung developer site:
https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html

During installation, make sure the **TV Extensions** package is selected.

---

## Step 3 — Connect your computer to the TV

Open a terminal (Command Prompt on Windows, Terminal on Mac) and run:

```
sdb connect <TV_IP>
```

Replace `<TV_IP>` with your TV's IP address. You can find it on the TV under
**Settings** → **General** → **Network** → **Network Status** → **IP Settings**.

Confirm the connection worked:

```
sdb devices
```

You should see your TV listed with status `device`.

---

## Step 4 — Install the app

Run the following command, replacing `<TV_IP>` with your TV's IP address:

```
tizen install --name CableJack.wgt -- <TV_IP>:26101
```

If successful you will see `Installed the package` in the output.

---

## Step 5 — Launch the app

CableJack will now appear in your TV's **Apps** section. You can also launch it
from the terminal:

```
tizen run -p CableJack.App -- <TV_IP>:26101
```

---

## Troubleshooting

**`sdb connect` times out**
Make sure your computer and TV are on the same Wi-Fi network and that developer
mode is enabled. Some routers block device-to-device traffic — try connecting
both to the same 2.4 GHz or 5 GHz band.

**`tizen` or `sdb` command not found**
Add the Tizen Studio tools to your PATH. The default locations are:
- Windows: `C:\tizen-studio\tools` and `C:\tizen-studio\tools\ide\bin`
- Mac: `~/tizen-studio/tools` and `~/tizen-studio/tools/ide/bin`

**`install failed` or certificate error**
Developer mode may have timed out — it resets after a few days. Re-enable it on
the TV (Step 1) and try again.

**App does not load / shows a blank screen**
Make sure your TV can reach `https://cablejack.tv`. Check **Settings** →
**General** → **Network** to confirm the TV is connected to the internet.
