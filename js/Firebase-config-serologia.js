const firebaseConfig = {
    apiKey: "TU_API_KEY_NUEVA",
    authDomain: "estadisticaneonatal-xxxx.firebaseapp.com",
    projectId: "estadisticaneonatal-xxxx",
    storageBucket: "estadisticaneonatal-xxxx.firebasestorage.app",
    messagingSenderId: "...",
    appId: "..."
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
