# InverseUI

Record your browser actions and generate automation scripts that understand what you're trying to do. Run with your own credentials on your own machine — no cloud, no data leaving your browser. When something breaks, it fixes itself and keeps going. Full access to your local files for real-world workflows.

---

## Getting Started

Record browser interactions and get automation code. This guide walks you through installation, capturing your first interaction, and running automated workflows.

### Installation

#### Install the Chrome Extension

Download and install the InverseUI Chrome extension to start capturing UI interactions:

1. Download the extension from [GitHub Releases](https://github.com/anthropics/inverseui/releases)
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** in the top right corner
5. Click **Load unpacked** and select the unzipped folder

Once installed, you'll see the InverseUI icon in your browser toolbar.

#### Sign In

Before recording, sign in to your InverseUI account:

1. Visit [inverseui.com/login](https://inverseui.com/login)
2. Sign in with your account
3. The extension will automatically detect your session

---

### First Recording

Let's capture your first UI interaction and generate automation code.

#### 1. Start Recording

Click the InverseUI extension icon in your toolbar and select **Start Recording**. You'll see a "rec" badge indicating recording is active.

Now perform any actions you want to automate:
- Click buttons and links
- Fill out forms
- Navigate between pages
- Upload files
- Use keyboard shortcuts

#### 2. Stop Recording

When you're done, click the extension icon again and select **Stop Recording**.

InverseUI automatically:
- Uploads your recording to the cloud
- Generates Playwright automation code
- Opens your recording in the dashboard

#### 3. Review & Export

Your recording is now available at `inverseui.com/track/{track_id}`:

| What You Get | Description |
|--------------|-------------|
| **Recorded Actions** | Every click, input, and navigation captured |
| **Generated Code** | Clean Playwright code with typed parameters |
| **Intent Detection** | Smart comments explaining what each action does |
| **Reusable Functions** | Parameters auto-detected for flexible automation |

Download the generated code or copy it directly into your project.

---

### Run with CLI

Run your recorded automations locally with automatic error recovery.

[View on PyPI](https://pypi.org/project/inverseui/)

#### Install CLI

Requires Python 3.10+ and Google Chrome.

```bash
pip install inverseui
```

#### Login

Authenticate via browser, then paste the code into your terminal.

```bash
inverseui login
```

#### Run a Track

Execute a recorded track by its ID.

```bash
inverseui run <track_id>
```

#### Fix with AI

Automatically retry failing scripts with AI-generated fixes.

```bash
inverseui fix <track_id>
```

---

### Programmatic Control

Control recording from your own scripts using the injected API:

```javascript
// Available on any page when extension is installed
const api = window.INVERSEUI_EXTENSION_API;

await api.startRecording();
// ... perform actions ...
await api.stopRecording();

const actions = await api.getActions();
```

For the complete API reference, see [Developer Guides](https://inverseui.com/docs).

---

## License

AGPL-3.0 — If you modify or use this code, you must publish your changes under the same license.
