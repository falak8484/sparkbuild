# ✨ SparkBuild — AI-Powered Website Builder

SparkBuild is a multi-page AI-assisted website builder that allows users to create, preview, edit, and export complete websites without coding.

Designed with a focus on simplicity, aesthetics, and usability, SparkBuild transforms user input into structured, visually appealing websites.

---

## 🚀 Features

- 🤖 AI-assisted website generation (prompt + form based)
- 🎨 Aesthetic and modern UI design
- 🧩 Multi-page website creation
- 👀 Real-time preview system
- 📁 Export-ready website output
- 🔐 Firebase Authentication (Email + Verification)
- ☁️ Firestore database integration
- 🕘 Project history and management
- 🖼️ Dynamic image handling

---

## 🧠 Project Overview

SparkBuild is built to simplify website creation for non-technical users.  
Instead of writing code, users can generate complete websites using structured input or prompts.

The system handles:
- layout generation  
- content structuring  
- page organization  
- user project storage  

This project demonstrates practical integration of frontend development, authentication systems, and database handling in a real-world product-like environment.

---

## 🛠️ Tech Stack

- HTML, CSS, Vanilla JavaScript  
- Firebase Authentication  
- Firestore Database  
- GitHub Pages (for hosting)

---

## 📄 Application Structure

### Pages
- `index.html` — Landing page  
- `register.html` — User registration  
- `signin.html` — User login  
- `dashboard.html` — User dashboard  
- `create.html` — Website builder  
- `preview.html` — Live preview  
- `history.html` — Saved projects  
- `help.html` — User guidance  

---

### JavaScript Modules

- `firebase-init.js` — Firebase configuration  
- `auth.js` — Authentication logic  
- `common.js` — Shared utilities  
- `builder.js` — Website creation logic  
- `generator.js` — Content generation logic  
- `preview.js` — Preview rendering  
- `dashboard.js` — Dashboard handling  
- `history.js` — Project management  

---

## ⚙️ Setup Instructions

1. Create a Firebase project  
2. Enable Email/Password Authentication  
3. Enable Email Verification  
4. Create Firestore Database  
5. Add Firebase config in `firebase-config.js`  
6. Run a local server:
   ```bash
   python3 -m http.server 5500

   made by falak shaikh
   
