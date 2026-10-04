# West Adams Holiday Time Off

A one-page form team members open on their phone to request holiday time off.
Every request lands as a row in a Google Sheet, where leaders approve or deny it.
There is no database to run: the Google Sheet is the record.

## The rules the form enforces

| Holiday      | Days that can be requested        | Closed |
|--------------|-----------------------------------|--------|
| Halloween    | Fri 10/30, Sat 10/31              |        |
| Thanksgiving | Tue 11/24, Wed 11/25, Fri 11/27, Sat 11/28 | Thu 11/26 |
| Christmas    | Wed 12/23, Thu 12/24, Sat 12/26   | Fri 12/25 |

- One holiday per person.
- 1 or 2 days. Two days must be back to back, so 11/25 + 11/27 and 12/24 + 12/26 are not allowed.
- One request per person (matched on first + last name, ignoring capitals and extra spaces).
  If a leader marks a request **Denied**, that person can submit a new one.
- Days that have already passed can't be requested.

Team members enter their first name, last name, pod, holiday and days.

## How leaders use it

Open the Google Sheet. Each request is a row on the **Requests** tab:

`Submitted | First Name | Last Name | Pod | Holiday | Dates | Status | Leader Notes`

New rows start as **Pending**. Change Status to **Approved** or **Denied** from the dropdown.
Team members can see their status on the page under "Check my request status".
Use Data > Create a filter to sort or filter by pod or holiday.

## One-time setup (about 10 minutes)

### 1. Create the Google Sheet and its script

1. Create a new Google Sheet, for example "Holiday Time Off 2026".
2. In the Sheet, open **Extensions > Apps Script**.
3. Replace everything in `Code.gs` with the contents of [`apps-script/Code.gs`](apps-script/Code.gs).
4. Click **+** next to Files > **Script**, name it `Rules`, and paste in the contents of [`rules.js`](rules.js).
5. Click the save icon. In the function dropdown at the top choose **setup** and click **Run**.
   Google asks you to authorize the script; allow it. This creates the **Requests** tab.
   If Google says "This app isn't verified", click **Advanced**, then **Go to (project name)**.
6. Click **Deploy > New deployment**. Click the gear icon, choose **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

"Anyone" means anyone with the link can submit the form, without a Google account.
The Sheet itself stays private to you.

If Extensions > Apps Script shows "page not found", you are probably signed into more than
one Google account. Either open the Sheet in a private/incognito window signed into only the
Sheet owner's account, or create the script at [script.google.com](https://script.google.com)
(New project) and set `SHEET_ID` at the top of `Code.gs` to the ID from the Sheet's address
(`docs.google.com/spreadsheets/d/<ID>/edit`). The Apps Script editor needs a computer.

### 2. Connect the page to the Sheet

Open [`config.js`](config.js) and paste the Web app URL between the quotes:

```js
window.APP_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycb.../exec'
};
```

Until this is filled in, the page runs in practice mode: it checks the rules but saves nothing.

### 3. Put the page online with GitHub Pages

1. In this GitHub repository go to **Settings > Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute the page is live at `https://<your-github-username>.github.io/<repo-name>/`.
   Share that link (or a QR code of it) with the team.

## Changing dates or rules later

All dates, pods and rules live in [`rules.js`](rules.js). After editing it:

1. Paste the new version into the `Rules` file in Apps Script.
2. Click **Deploy > Manage deployments**, click the pencil, set Version to **New version**, and Deploy.
   The Web app URL stays the same.
3. Commit the change here so the page picks it up too.

## Testing

```sh
node --test
```
