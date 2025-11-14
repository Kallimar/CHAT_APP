import { doc, getDoc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState(null);
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);

  const loadUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      setUserData(userData);

      // ✅ FIX: Create chats/{uid} if missing
      const chatsRef = doc(db, "chats", uid);
      const chatsSnap = await getDoc(chatsRef);

      if (!chatsSnap.exists()) {
        await setDoc(chatsRef, { chatsData: [] });
        console.log("Created chats document for new user:", uid);
      }

      // Redirect user
      if (userData.avatar && userData.name) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }

      // Update lastSeen
      await updateDoc(userRef, { lastSeen: Date.now() });

      setInterval(async () => {
        if (auth.currentUser) {
          await updateDoc(userRef, { lastSeen: Date.now() });
        }
      }, 60000);
    } catch (error) {
      console.error("loadUserData error:", error);
    }
  };

  useEffect(() => {
    if (userData) {
      const chatRef = doc(db, "chats", userData.id);

      const unSub = onSnapshot(chatRef, async (res) => {
        if (!res.exists()) return; // prevent crash for new users

        const chatItems = res.data().chatsData || [];
        const tempData = [];

        for (const item of chatItems) {
          const userRef = doc(db, "users", item.rId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();
          tempData.push({ ...item, userData });
        }

        tempData.sort((a, b) => b.updatedAt - a.updatedAt);

        setChatData(tempData);
      });

      return () => unSub();
    }
  }, [userData]);

  const value = {
    userData, setUserData,
    chatData, setChatData,
    loadUserData,
    messages, setMessages,
    messagesId, setMessagesId,
    chatUser, setChatUser,
    chatVisible, setChatVisible,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
