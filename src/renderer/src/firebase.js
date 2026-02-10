import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjjKdpyf9VI6N0INrKXC_e3G6jJOaDbPI",
  authDomain: "starhub-57baa.firebaseapp.com",
  databaseURL: "https://starhub-57baa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "starhub-57baa",
  storageBucket: "starhub-57baa.firebasestorage.app",
  messagingSenderId: "441078394630",
  appId: "1:441078394630:web:b3962d5d7e2ab46d233887",
  measurementId: "G-0J3N472MVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { app, analytics, database };
