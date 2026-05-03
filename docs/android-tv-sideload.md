# Installing CableJack on an Android TV

These steps walk through sideloading the CableJack app onto an Android TV, Google TV,
or Onn TV. You will need a Windows or Mac computer on the same network as your TV.

---

## Step 1 — Enable developer options on the TV

1. On your TV, open **Settings**
2. Scroll down to **Device Preferences** (sometimes listed as **About** or **System**)
3. Select **About** and scroll to **Build**
4. Click **Build** seven times in a row — you will see a message saying
   "You are now a developer"

On Google TV the path may differ slightly:
**Settings** → **System** → **About** → **Android TV OS Build**

---

## Step 2 — Enable network debugging

1. Go back to **Device Preferences** → **Developer options**
2. Turn **Developer options** on if it is not already
3. Scroll down and enable **Network debugging** (sometimes labelled **ADB debugging over network** or **Wireless debugging**)
4. Note the IP address and port shown on screen — you will need both in Step 4

To find your TV's IP address if it is not shown: **Settings** → **Network & Internet** → select your Wi-Fi network → scroll down to see the IP address.

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

## Step 4 — Connect your computer to the TV

Run the following command, replacing `<TV_IP>` with your TV's IP address:

```
adb connect <TV_IP>
```

If your TV showed a specific port in Step 2 (common on Android 11+ with wireless
debugging), use `<TV_IP>:<PORT>` instead.

A prompt may appear on your TV asking to allow the connection — select **Allow**.

Confirm the connection worked:

```
adb devices
```

You should see your TV listed with status `device`.

---

## Step 5 — Install the app

```
adb install app-debug.apk
```

If successful you will see `Performing Streamed Install` followed by `Success`.

---

## Step 6 — Launch the app

CableJack will now appear in your TV's app list under the **Apps** row. You can also
launch it from the terminal:

```
adb shell am start -n tv.cablejack.app/.MainActivity
```

---

## Troubleshooting

**`adb connect` times out or says "Connection refused"**
Make sure your computer and TV are on the same Wi-Fi network and that network
debugging is enabled (Step 2). Some routers block device-to-device traffic — try
connecting both to the same 2.4 GHz or 5 GHz band.

**A pairing code is requested instead of just an IP**
Android 11+ introduced a separate pairing step for wireless debugging. On the TV go to
**Developer options** → **Wireless debugging** → **Pair device with pairing code**, then
on your computer run `adb pair <TV_IP>:<PAIR_PORT>` and enter the code shown. After
pairing succeeds, connect normally with `adb connect <TV_IP>:<DEBUG_PORT>`.

**`adb` command not found**
Make sure platform-tools is on your PATH (Windows) or that the Homebrew package
installed correctly (Mac).

**`adb install` fails with "INSTALL_FAILED_VERIFICATION_FAILED"**
Go to **Developer options** on the TV and disable **Verify apps over ADB**, then retry.

**App does not load / shows a blank screen**
Make sure your TV can reach `https://cablejack.tv`. Check **Settings** →
**Network & Internet** to confirm the TV is connected to the internet.
