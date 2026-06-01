# ⚡ Cyrabell Dental MS — Gemini OCR Fast Setup Guide

**Goal:** Reduce OCR scan time from ~2 minutes → 5-10 seconds  
**Root cause of slowness:** Google Apps Script "cold start" delay (30-60s every time it hasn't been used recently)  
**Fix:** Call Gemini AI directly from the browser — no Apps Script involved for OCR

---

## OVERVIEW: 2 Parts

| Part | What | Time |
|------|------|------|
| **Part A** | Get your free Gemini API key | 3 minutes |
| **Part B** | Enter the key in Cyrabell app | 1 minute |
| **Part C** | Update & redeploy your Apps Script | 5 minutes |

> **Part B alone is enough to fix the slowness.** Part C makes the Apps Script more reliable as a fallback.

---

## PART A — Get Your Free Gemini API Key

> ✅ Free — no credit card required  
> ✅ 15 scans per minute, 1,500 scans per day — plenty for a clinic

### Step A-1: Open Google AI Studio

1. Open your browser
2. Go to: **https://aistudio.google.com/app/apikey**
3. Sign in with your **Google account** (the same one that owns your Apps Script)

### Step A-2: Create an API Key

1. Click the blue **"Create API key"** button
2. A dialog appears — select **"Create API key in new project"**
   - (Or choose an existing project if you already have one)
3. Your new key appears — it looks like: `AIzaSy...` (about 39 characters)

### Step A-3: Copy the Key

1. Click the **copy icon** next to the key
2. Paste it somewhere safe temporarily (Notepad, Notes app)
3. **Do not share this key publicly** — it's tied to your Google account

---

## PART B — Enter the Key in Cyrabell App (FIXES THE SPEED)

> This makes OCR go directly to Gemini — bypassing Apps Script entirely.

### Step B-1: Open Cyrabell

1. Open your Cyrabell Dental MS app in the browser
2. Look at the **left sidebar**

### Step B-2: Go to Sync Settings

1. Click **☁️ Sync** in the sidebar
2. The Sync page opens

### Step B-3: Find the Gemini OCR Card

1. At the **top of the page**, you will see a card titled:
   > **⚡ Gemini OCR (Fast Mode)**
   
   It has a blue top border to make it easy to spot.

### Step B-4: Enter Your Key

1. Click inside the input field that says:
   > `AIza… (get free key at aistudio.google.com)`
2. Paste your Gemini API key (`AIzaSy...`)
3. The key saves **automatically** as you type — no Save button needed

### Step B-5: Show/Hide the Key

- Click **👁 Show** button to verify you pasted it correctly
- Click **🙈 Hide** to hide it again after confirming

### Step B-6: Test the Key

1. Click the **"🔬 Test Gemini Key"** button
2. Wait 3-5 seconds
3. You should see a green toast notification:
   > ✅ Gemini key is valid!
4. If you see an error:
   - Click 👁 Show and double-check the key is complete (starts with `AIza`, ~39 chars)
   - Make sure you copied the full key without spaces

### Step B-7: Test a Scan

1. Go to any patient → **History tab**
2. Click **"📷 Scan Record Card"** or **"+ New Record"**
3. Upload or take a photo of a patient record card
4. The processing screen now shows:
   - **"⚡ Gemini AI Analyzing…"** (not "Claude AI")
   - A live progress bar: 10% → 30% → 85% → 100%
5. Total time: **5-10 seconds** ✅

---

## PART C — Update Your Apps Script (Fallback Reliability)

> This updates the Apps Script with speed fixes. Even if you completed Part B,
> this improves the fallback behavior when no direct key is set.

### Step C-1: Open Your Apps Script Project

1. Go to: **https://script.google.com**
2. Sign in with the same Google account
3. Click on your **Cyrabell** project (e.g., "CyrabellDMS" or similar)

### Step C-2: Open Code.gs

1. In the left panel, click **Code.gs** (or your main script file)
2. You will see your existing code

### Step C-3: Replace the OCR Handler Code

1. In the file, find the section with `handleClaudeOcr` or `handleOcr`
2. **Select ALL the code** in Code.gs (`Ctrl+A` or `Cmd+A`)
3. **Delete it all**
4. Open the file `APPS_SCRIPT_GEMINI_OCR.js` from the Cyrabell repository
5. **Copy everything** from that file
6. **Paste it** into Code.gs

   > The new file includes:
   > - `doGet` — health check (ping)
   > - `doPost` — routes `geminiOcr` and `claudeOcr` actions (both work)
   > - `handleOcr` — tries Gemini → OpenAI → Anthropic in order
   > - `callGemini` — with `temperature: 0` and `responseMimeType: application/json` for speed
   > - `uploadFileToDrive` and `deleteFileFromDrive`
   > - Setup utilities: `authorizeAll`, `setupGeminiKey`, `checkApiKeyStatus`

### Step C-4: Save the File

1. Press **Ctrl+S** (or **Cmd+S** on Mac)
2. Or click **File → Save**

### Step C-5: Run authorizeAll (if first time setup)

> Skip this step if your Apps Script is already working for Drive uploads.

1. In the function dropdown at the top (shows "Select function"), choose **`authorizeAll`**
2. Click ▶ **Run**
3. A permissions dialog appears — click **"Review permissions"**
4. Choose your Google account
5. You may see **"Google hasn't verified this app"** — that's normal
   - Click **"Advanced"**
   - Click **"Go to [your project name] (unsafe)"**
6. Click **"Allow"**
7. Check the **Execution log** at the bottom — you should see:
   ```
   Sheets: [your spreadsheet name]
   Drive: My Drive
   UrlFetch: OK (200)
   ✅ Done. Now redeploy as a new version.
   ```

### Step C-6: Verify Your Gemini Key is Saved in Apps Script

1. In the function dropdown, choose **`checkApiKeyStatus`**
2. Click ▶ **Run**
3. Check the Execution log — you should see:
   ```
   GEMINI_API_KEY:    AIzaSy...(39 chars)
   Active provider: Gemini (free)
   ```
4. If it shows `(not set)`:
   - Go to **Project Settings** (gear icon ⚙️ on left)
   - Click **"Script properties"** tab
   - Click **"Add script property"**
   - Property name: `GEMINI_API_KEY`
   - Value: your `AIza...` key
   - Click **"Save script properties"**

### Step C-7: Deploy as a New Version

> **Important:** You must create a NEW version — editing code does NOT update the live deployment automatically.

1. Click **Deploy** (top right blue button)
2. Click **"Manage deployments"**
3. Find your existing deployment (the one with your Apps Script URL)
4. Click the **✏️ pencil/edit icon** on the right
5. In the **"Version"** dropdown, select **"New version"**
6. Optionally add a description like: `v4 - Gemini speed fixes`
7. Click **"Deploy"**
8. The URL stays the same — no need to update Cyrabell settings

### Step C-8: Verify Deployment

1. Copy your Apps Script web app URL
2. Open it in a new browser tab
3. You should see:
   ```json
   {"ok":true,"pong":true,"service":"CyrabellDMS","version":"4.0"}
   ```
4. If you see this, the deployment is working ✅

---

## TROUBLESHOOTING

### "Invalid Gemini API key" error in the app

- Click 👁 Show in the Gemini OCR card and verify the key starts with `AIza`
- Make sure there are no extra spaces before or after the key
- Try generating a new key at aistudio.google.com

### "Gemini rate limit" error

- Free tier: 15 scans per minute
- Wait 15 seconds and try again
- For heavy usage, the rate limit resets every minute automatically

### OCR still slow after entering key in app

- Check that the ✓ green confirmation shows: **"Key saved — OCR will use direct Gemini (fast mode)"**
- If it shows a warning instead, the key may be incomplete
- Try clicking 🔬 Test Gemini Key — it must show ✅ green before fast mode works

### "Could not parse AI response" error

- This is rare — it means Gemini returned text instead of JSON
- Try the scan again (retry usually succeeds)
- This was more common before the `responseMimeType: application/json` fix in the new Apps Script

### Apps Script URL not working after redeploy

- Make sure you selected **"New version"** — not the same version
- The URL should remain the same as before
- Test the URL directly in the browser (Step C-8 above)

### "No AI API key configured" from Apps Script

- The Gemini key is not in Script Properties
- Follow Step C-6 above to add it

---

## QUICK REFERENCE — Key Locations

| Where | What to paste |
|-------|--------------|
| Cyrabell → ☁️ Sync → ⚡ Gemini OCR card | Gemini API key (for fast direct mode) |
| Apps Script → Project Settings → Script Properties | `GEMINI_API_KEY` = same key (for fallback) |
| Cyrabell → ☁️ Sync → ☁️ Google Sheets card | Apps Script web app URL (for Drive uploads & data sync) |

---

## EXPECTED PERFORMANCE AFTER SETUP

| Scenario | Time |
|----------|------|
| Basic patient card scan | 5-8 seconds |
| Full examination record scan | 8-12 seconds |
| First scan of the day (cold start) | Same — no cold start in direct mode |
| Batch scanning 10 cards | ~8s each |

---

*Cyrabell Dental MS — Gemini OCR Setup Guide*  
*Last updated: June 2026*
