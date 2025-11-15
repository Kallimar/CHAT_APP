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

  // Load user profile from Firestore
  // const loadUserData = async (uid) => {
  //   try {
  //     const userRef = doc(db, "users", uid);
  //     const userSnap = await getDoc(userRef);

  //     if (!userSnap.exists()) return;

  //     const uData = userSnap.data();
  //     setUserData(uData);

  //     if (uData.avatar && uData.name) navigate("/chat");
  //     else navigate("/profile");

  //     // Update lastSeen
  //     await updateDoc(userRef, { lastSeen: Date.now() });

  //     setInterval(async () => {
  //       if (auth.currentUser) {
  //         await updateDoc(userRef, { lastSeen: Date.now() });
  //       }
  //     }, 60000);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };
const loadUserData = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);

    let userSnap = await getDoc(userRef);

    // 🔥 WAIT for the signup() to finish writing Firestore
    let retries = 0;
    while (!userSnap.exists() && retries < 10) {
      await new Promise(res => setTimeout(res, 300));
      userSnap = await getDoc(userRef);
      retries++;
    }

    // 🔥 If STILL no document → fail safely
    if (!userSnap.exists()) {
      console.log("User document NOT FOUND after signup.");
      return;
    }

    const uData = { id: uid, ...userSnap.data() };
    setUserData(uData);

    if (uData.avatar && uData.name) navigate("/chat");
    else navigate("/profile");

    await updateDoc(userRef, { lastSeen: Date.now() });

  } catch (err) {
    console.log(err);
  }
};



  // Listen for chats list
  useEffect(() => {
    if (!userData) return;

    // const chatRef = doc(db, "chats", userData.id);
    const chatRef = doc(db, "chats", auth.currentUser.uid);

    const unSub = onSnapshot(chatRef, async (res) => {
      const data = res.data();
      if (!data || !Array.isArray(data.chatsData)) {
        setChatData([]);
        return;
      }

      const temp = [];
      for (const item of data.chatsData) {
        const userRef = doc(db, "users", item.rId);
        const userSnap = await getDoc(userRef);
        temp.push({ ...item, userData: userSnap.data() });
      }

      setChatData(temp.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    return () => unSub();
  }, [userData]);

  const value = {
    userData,
    setUserData,
    chatData,
    setChatData,
    loadUserData,
    messages,
    setMessages,
    messagesId,
    setMessagesId,
    chatUser,
    setChatUser,
    chatVisible,
    setChatVisible,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
