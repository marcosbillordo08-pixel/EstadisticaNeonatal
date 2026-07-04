const firebaseConfig = {
    apiKey: "AIzaSyCWLjkWaCdDzMe8maeBsVJQOSWHVr-u71Y",
    authDomain: "estadisticaneonatal.firebaseapp.com",
    projectId: "estadisticaneonatal",
    storageBucket: "estadisticaneonatal.firebasestorage.app",
    messagingSenderId: "1056375979575",
    appId: "1:1056375979575:web:61762c6d053c133131c9b2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
