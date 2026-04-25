import { auth } from "./firebase-init.js";
import { protectPage } from "./auth.js";
import { qs, showStatus, clearStatus } from "./common.js";
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

await protectPage({ requireVerified:false });

const form = qs('#registerForm');
const status = qs('#registerStatus');

let lastUser = null; // for resend

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearStatus(status);

  const email = qs('#registerEmail').value.trim();
  const password = qs('#registerPassword').value;
  const confirm = qs('#registerConfirmPassword').value;

  if (password.length < 6) {
    return showStatus(status, 'error', 'Password must be at least 6 characters.');
  }

  if (password !== confirm) {
    return showStatus(status, 'error', 'Passwords do not match.');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    lastUser = result.user;

    await sendEmailVerification(result.user);
    await signOut(auth);
    form.reset();

    showStatus(
      status,
      'success',
      `
      <div style="line-height:1.6;">
        <strong>Account created successfully 🎉</strong><br><br>
        We’ve sent a verification email to your address.<br>
        Please check your <b>Inbox</b> or <b>Spam folder</b> and click the link to activate your account.<br><br>
        After verification, you can sign in and start building your website ✨<br><br>
        — <b>SparkBuild Team 💚</b><br><br>
        <button id="resendBtn" style="padding:8px 14px;border:none;border-radius:8px;background:#6fbf9f;color:white;cursor:pointer;">
          Resend Email
        </button>
      </div>
      `
    );

    // resend button
    setTimeout(() => {
      const btn = document.getElementById('resendBtn');
      if (btn && lastUser) {
        btn.onclick = async () => {
          try {
            await sendEmailVerification(lastUser);
            showStatus(status, 'success', 'Verification email sent again 📩 — check Inbox or Spam.');
          } catch {
            showStatus(status, 'error', 'Failed to resend email.');
          }
        };
      }
    }, 100);

  } catch (error) {
    const map = {
      'auth/email-already-in-use': 'That email is already registered.',
      'auth/invalid-email': 'Please enter a valid email.',
      'auth/weak-password': 'Password is too weak.'
    };

    showStatus(status, 'error', map[error.code] || error.message || 'Could not create account.');
  }
});