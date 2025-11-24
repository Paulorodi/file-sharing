import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { ChatMessage, UserProfile } from "../types";

// ============================================================================
// ⚠️ PASTE YOUR FIREBASE CONFIGURATION HERE ⚠️
// Go to Firebase Console > Project Settings > General > Your Apps > SDK Setup and Configuration
// ============================================================================
const firebaseConfig = {
  apiKey: "REPLAAIzaSyATkjWtu-HKc_WOBBdGi53aQS2u1osD98g",
  authDomain: "neuroshare.firebaseapp.com",
  projectId: "neuroshare",
  storageBucket: "neuroshare.firebasestorage.app",
  messagingSenderId: "127027837170",
  appId: "1:127027837170:web:cfe46188f93ec7c921786b"
};

// Initialize Firebase
let db: any = null;
let isConfigured = false;

try {
    // Simple check to see if the user has updated the config
    if (firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isConfigured = true;
        console.log("Firebase initialized successfully.");
    } else {
        console.warn("Firebase config missing. Chat will be offline.");
    }
} catch (e) {
    console.error("Firebase init error:", e);
}

export const isFirebaseReady = () => isConfigured;

// --- User Management ---
export const registerUserInCloud = async (user: UserProfile) => {
    if (!db) return;
    try {
        const userRef = doc(db, "users", user.id);
        await setDoc(userRef, {
            name: user.name,
            avatar: user.avatar,
            isAdmin: user.isAdmin || false,
            lastSeen: serverTimestamp(),
            joinedAt: user.joinedAt || Date.now()
        }, { merge: true });
    } catch (e) {
        console.error("Error registering user:", e);
    }
};

// --- Chat Management ---
export const subscribeToCommunityChat = (callback: (messages: ChatMessage[]) => void) => {
    if (!db) return () => {};

    const q = query(
        collection(db, "community_chat"), 
        orderBy("timestamp", "desc"), 
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                content: data.content,
                timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(), 
                isCommunity: true,
                isSystem: data.isSystem || false
            });
        });
        // Return reversed (oldest first) for chat UI
        callback(messages.reverse());
    });

    return unsubscribe;
};

export const sendCloudMessage = async (msg: Partial<ChatMessage>) => {
    if (!db) return;
    try {
        await addDoc(collection(db, "community_chat"), {
            senderId: msg.senderId,
            senderName: msg.senderName,
            content: msg.content,
            timestamp: serverTimestamp(),
            isSystem: msg.isSystem || false
        });
    } catch (e) {
        console.error("Error sending message:", e);
    }
};

export const deleteCloudMessage = async (msgId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, "community_chat", msgId));
    } catch (e) {
        console.error("Error deleting message:", e);
    }
};