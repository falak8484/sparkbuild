import { auth } from "./firebase-init.js";
import { protectPage } from "./auth.js";
import { qs, showStatus, clearStatus } from "./common.js";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

await protectPage({ requireVerified:false });
const form = qs('#signinForm');
const status = qs('#signinStatus');
const resendBtn = qs('#resendVerificationBtn');
const emailInput = qs('#signinEmail');
const passwordInput = qs('#signinPassword');

if (new URLSearchParams(location.search).get('unverified')) {
  showStatus(status, 'info', 'Your email is not verified yet. Verify it first, then sign in.');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearStatus(status);
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      localStorage.setItem('sparkbuild_last_unverified_email', email);
      resendBtn.classList.remove('hidden');
      await signOut(auth);
      showStatus(status, 'error', 'Please verify your email before signing in.');
      return;
    }
    showStatus(status, 'success', 'Signed in. Opening your dashboard…');
    setTimeout(() => location.replace('dashboard.html'), 250);
  } catch (error) {
    const map = {
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/user-not-found': 'No user found with this email.',
      'auth/invalid-email': 'Please enter a valid email.',
      'auth/too-many-requests': 'Too many attempts. Please wait a bit and try again.',
    };
    showStatus(status, 'error', map[error.code] || error.message || 'Sign in failed.');
  }
});

resendBtn?.addEventListener('click', async () => {
  const email = localStorage.getItem('sparkbuild_last_unverified_email') || emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showStatus(status, 'error', 'Enter your email and password first.');
    return;
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    await signOut(auth);
    showStatus(status, 'success', 'Verification email sent again. Check inbox and spam.');
  } catch (error) {
    showStatus(status, 'error', error?.message || 'Could not resend verification email.');
  }
});
