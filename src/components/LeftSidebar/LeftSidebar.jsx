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
import { db, auth } from "../../config/firebase";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const {
    userData,
    chatData,
    setChatUser,
    setMessagesId,
    chatVisible,
    setChatVisible,
  } = useContext(AppContext);

  // 🔥 Prevent rendering until userData is loaded
  if (!userData || !userData.id) {
    console.log("⏳ LeftSidebar waiting for userData...");
    return null;
  }

  const myId = auth.currentUser.uid;   // 🔥 ALWAYS USE THIS

  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const inputHandler = async (e) => {
    const input = e.target.value;
    if (!input) {
      setShowSearch(false);
      return;
    }

    try {
      setShowSearch(true);
      const snap = await getDocs(
        query(collection(db, "users"), where("username", "==", input.toLowerCase()))
      );

      if (!snap.empty && snap.docs[0].data().id !== myId) {
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

  const addChat = async () => {
    try {
      const msgRef = doc(collection(db, "messages"));

      await setDoc(msgRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

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
        rId: myId,
        updatedAt: Date.now(),
        messageSeen: true,
      };

      // 🔥 Use myId, not userData.id
      await updateDoc(doc(db, "chats", myId), {
        chatsData: arrayUnion(chatEntry1),
      });

      await updateDoc(doc(db, "chats", user.id), {
        chatsData: arrayUnion(chatEntry2),
      });

      setMessagesId(msgRef.id);
      setChatUser({ ...chatEntry1, userData: user });
      setChatVisible(true);
      setShowSearch(false);
    } catch (err) {
      toast.error("Error creating chat");
      console.log(err);
    }
  };

  const setChat = async (item) => {
    try {
      const msgDoc = doc(db, "messages", item.messageId);
      const msgSnap = await getDoc(msgDoc);

      if (!msgSnap.exists()) {
        await setDoc(msgDoc, { createdAt: Date.now(), messages: [] });
      }

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
            <img
              src={assets.menu_icon}
              alt="menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            />
            <div className={`sub-menu ${menuOpen ? "active" : ""}`}>
              <p onClick={() => navigate("/profile")}>Edit Profile</p>
              <hr />
              <p onClick={() => logout()}>Logout</p>
            </div>
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
