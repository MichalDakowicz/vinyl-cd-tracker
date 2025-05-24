import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js"; 

const firebaseConfig = {
    apiKey: "AIzaSyC-UfY5P8VjTNoHkAEUVzLqrQX9TgchbuY",
    authDomain: "vinyl-cd-tracker.firebaseapp.com",
    databaseURL:
        "https://vinyl-cd-tracker-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vinyl-cd-tracker",
    storageBucket: "vinyl-cd-tracker.firebasestorage.app",
    messagingSenderId: "633202628278",
    appId: "1:633202628278:web:49e5761947741b75303817",
    measurementId: "G-03XZWG0TXY",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app); 
const provider = new GoogleAuthProvider();

export {
    database,
    auth,
    provider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
};
