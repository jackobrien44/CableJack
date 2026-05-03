# Installing CableJack on an Amazon Fire TV

These steps walk through sideloading the CableJack app onto an Amazon Fire TV Stick
or Fire TV cube/box. You will need a Windows or Mac computer on the same network as
your Fire TV.

---

## Step 1 — Enable developer options on the Fire TV

1. On your Fire TV, open **Settings**
2. Select **My Fire TV** (or **Device** on older models)
3. Select **About**
4. Click **Fire TV Stick** (or your device name) seven times in a row — you will see
   a message saying "No need, you are already a developer" or "You are now a developer"

---

## Step 2 — Enable ADB debugging and unknown sources

1. Go back to **My Fire TV** → **Developer Options**
2. Turn **ADB debugging** on
3. Turn **Apps from Unknown Sources** on — this is required to install apps that are
   not from the Amazon Appstore

---

## Step 3 — Install ADB on your computer

ADB (Android Debug Bridge) is the tool used to install apps over the network.

**Windows**
1. Download **SDK Platform Tools** from:
   https://developer.android.com/tools/releases/platform-tools
2. Extract the zip to a folder such as `C:\platform-tools`
3. Open Command Prompt in that folder, or add it to your PATH

**Mac**
```
brew install android-platform-tools
```

Homebrew must be installed first. Download it from https://brew.sh if needed.

Confirm ADB is working:

```
adb version
```

---

## Step 4 — Find your Fire TV's IP address

On your Fire TV: **Settings** → **My Fire TV** → **About** → **Network**

The IP address is listed there.

---

## Step 5 — Connect your computer to the Fire TV

```
adb connect <FIRE_TV_IP>
```

A prompt will appear on your Fire TV asking to allow the connection — select **OK**.

Confirm the connection worked:

```
adb devices
```

You should see your Fire TV listed with status `device`.

---

## Step 6 — Install the app

```
adb install app-debug.apk
```

If successful you will see `Performing Streamed Install` followed by `Success`.

---

## Step 7 — Launch the app

After installing, CableJack will appear under **Your Apps & Channels**. Scroll right
to find it, or check **Recent** at the start of the row.

You can also launch it from the terminal:

```
adb shell am start -n tv.cablejack.app/.MainActivity
```

---

## Troubleshooting

**`adb connect` times out or says "Connection refused"**
Make sure ADB debugging is enabled (Step 2) and that your computer and Fire TV are on
the same Wi-Fi network. After enabling ADB debugging, give it a few seconds before
connecting.

**No allow/deny prompt appears on the Fire TV**
Disconnect and reconnect: `adb disconnect <FIRE_TV_IP>` then `adb connect <FIRE_TV_IP>`.
The prompt can sometimes appear in the background — press the Home button and look for
a dialog.

**`adb install` fails with "INSTALL_FAILED_FROM_UNKNOWN_SOURCES"**
Make sure **Apps from Unknown Sources** is turned on in Developer Options (Step 2).

**App does not appear in Your Apps & Channels**
Wait a moment and refresh. If it still does not appear, launch it once via the terminal
command in Step 7 — it will show up in the list after its first launch.

**App does not load / shows a blank screen**
Make sure your Fire TV can reach `https://cablejack.tv`. Check **Settings** →
**Network** to confirm the Fire TV is connected to the internet.
