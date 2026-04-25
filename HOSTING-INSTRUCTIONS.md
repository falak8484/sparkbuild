# Running locally

Because the app uses ES modules and Firebase, serve the folder through a simple local server instead of opening files directly from Finder.

Examples:
- Python: `python3 -m http.server 5500`
- VS Code Live Server extension
- Any other basic static server

Then open:
http://localhost:5500/index.html

# Public deployment

Upload the whole folder to any static hosting provider.

Important:
- Keep `index.html` in the root.
- Keep the `assets/` folder structure unchanged.
- Keep `firebase-config.js` in the root.
- Make sure your Firebase Authentication allowed domain list includes your public domain.

# Firebase reminders

Authentication:
- Enable Email/Password sign-in.
- Use email verification.

Firestore:
- Create a database.
- Add rules that allow authenticated users to read and write only their own project data.

Suggested rule idea:
Users can read/write only documents where `request.auth.uid == resource.data.userId` or incoming `request.resource.data.userId`.
