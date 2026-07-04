const firebaseConfig = {
            apiKey: "AIzaSyC21cJIHv1sEBQ2WVgBB_b3OG8rklNhJmg",
            authDomain: "stocklab-4e30e.firebaseapp.com",
            projectId: "stocklab-4e30e",
            storageBucket: "stocklab-4e30e.firebasestorage.app",
            messagingSenderId: "104155908756",
            appId: "1:104155908756:web:314cd3dc78ef94437a0281",
            measurementId: "G-PVKEDY9JY9"
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
