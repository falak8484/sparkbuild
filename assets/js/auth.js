import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { qs } from "./common.js";

function setAuthStateClass(state) {
  document.body.classList.remove('auth-pending','auth-ready');
  document.body.classList.add(state);
}

export function protectPage({ requireVerified=true, redirectTo='signin.html' }={}) {
  setAuthStateClass('auth-pending');
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      try {
        const authOnly = document.body.dataset.authOnly === 'true';
        const guestOnly = document.body.dataset.guestOnly === 'true';

        if (!user) {
          if (authOnly) {
            location.replace(redirectTo);
            return;
          }
          setAuthStateClass('auth-ready');
          resolve(null);
          return;
        }

        if (user && guestOnly && user.emailVerified) {
          location.replace('dashboard.html');
          return;
        }

        if (user && authOnly && requireVerified && !user.emailVerified) {
          location.replace('signin.html?unverified=1');
          return;
        }

        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            uid: user.uid,
            email: user.email || '',
            createdAt: serverTimestamp(),
          });
        }

        qs('[data-user-email]')?.replaceChildren(document.createTextNode(user.email || ''));
        setAuthStateClass('auth-ready');
        resolve(user);
      } catch (error) {
        console.error('Auth guard failed:', error);
        setAuthStateClass('auth-ready');
        resolve(user || null);
      }
    }, (error) => {
      console.error('Auth state listener error:', error);
      setAuthStateClass('auth-ready');
      resolve(null);
    });
  });
}

export function setupLogoutButton(selector='[data-logout]') {
  qs(selector)?.addEventListener('click', async () => {
    await signOut(auth);
    location.replace('signin.html');
  });
}
