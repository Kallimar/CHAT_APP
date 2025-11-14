import React, { useContext, useEffect, useState } from "react";
import "./LeftSidebar.css";
import assets from "../../assets/assets";
import { logout } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const {
    userData,
    chatData,
    setChatUser,
    setMessagesId,
    messagesId,
    chatVisible,
    setChatVisible,
  } = useContext(AppContext);

  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const inputHandler = async (e) => {
    const input = e.target.value;
    if (!input) {
      setShowSearch(false);
      return;
    }

    try {
      setShowSearch(true);

      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", input.toLowerCase()));
      const snap = await getDocs(q);

      if (!snap.empty && snap.docs[0].data().id !== userData.id) {
        const data = snap.docs[0].data();
        const exists = chatData?.some((c) => c.rId === data.id);

        setUser(exists ? null : data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Create a new chat between two users
  const addChat = async () => {
    try {
      const msgRef = doc(collection(db, "messages"));

      // Create messages document
      await setDoc(msgRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      // Create chat in both users
      const chatEntry1 = {
        messageId: msgRef.id,
        lastMessage: "",
        rId: user.id,
        updatedAt: Date.now(),
        messageSeen: true,
      };

      const chatEntry2 = {
        messageId: msgRef.id,
        lastMessage: "",
        rId: userData.id,
        updatedAt: Date.now(),
        messageSeen: true,
      };

      await updateDoc(doc(db, "chats", userData.id), {
        chatsData: arrayUnion(chatEntry1),
      });

      await updateDoc(doc(db, "chats", user.id), {
        chatsData: arrayUnion(chatEntry2),
      });

      setMessagesId(msgRef.id);
      setChatUser({
        ...chatEntry1,
        userData: user,
      });
      setChatVisible(true);
      setShowSearch(false);
    } catch (err) {
      toast.error("Error creating chat");
      console.log(err);
    }
  };

  // Open chat
  const setChat = async (item) => {
    try {
      // 1. Ensure messages document exists
      const msgDoc = doc(db, "messages", item.messageId);
      const msgSnap = await getDoc(msgDoc);

      if (!msgSnap.exists()) {
        await setDoc(msgDoc, { createdAt: Date.now(), messages: [] });
      }

      // 2. Set UI state
      setMessagesId(item.messageId);
      setChatUser(item);
      setChatVisible(true);
    } catch (err) {
      toast.error("Failed to open chat");
      console.log(err);
    }
  };

  return (
    <div className={`ls ${chatVisible ? "hidden" : ""}`}>
      <div className="ls-top">
        <div className="ls-nav">
          <img src={assets.logo} className="logo" alt="" />
          <div className="menu">
            <img src={assets.menu_icon} alt="" onClick={() => navigate("/profile")} />
          </div>
        </div>

        <div className="ls-search">
          <img src={assets.search_icon} alt="" />
          <input type="text" onChange={inputHandler} placeholder="Search Here" />
        </div>
      </div>

      <div className="ls-list">
        {showSearch && user ? (
          <div onClick={addChat} className="friends">
            <img src={user.avatar || assets.avatar_icon} alt="" />
            <p>{user.name}</p>
          </div>
        ) : (
          chatData?.map((item, i) => (
            <div
              key={i}
              onClick={() => setChat(item)}
              className={`friends ${item.messageSeen ? "" : "border"}`}
            >
              <img src={item.userData.avatar || assets.avatar_icon} alt="" />
              <div>
                <p>{item.userData.name}</p>
                <span>{item.lastMessage}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
