import React, { useContext, useEffect, useState } from 'react'
import './ChatBox.css'
import assets from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { toast } from 'react-toastify'
import axios from 'axios'  // ✅ import axios for Cloudinary upload

const ChatBox = () => {
  const { userData, messagesId, chatUser, messages, setMessages, chatVisible, setChatVisible } = useContext(AppContext)

  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false) // ✅ added this state

  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
        setMessages(res.data().messages.reverse())
      })
      return () => {
        unSub()
      }
    }
  }, [messagesId])

  // ✅ Cloudinary upload helper
  const uploadToCloudinary = async (file) => {
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', 'chat-app') // your unsigned preset
    data.append('cloud_name', 'djpgslb4a') // your Cloudinary cloud name

    try {
      setUploading(true)
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/djpgslb4a/image/upload',
        data
      )
      setUploading(false)
      return res.data.secure_url
    } catch (err) {
      console.error('Cloudinary upload failed:', err)
      setUploading(false)
      toast.error('Image upload failed')
      return null
    }
  }

  const sendMessage = async () => {
    try {
      if (input && messagesId) {
        await updateDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: new Date(),
          }),
        })

        const userIDs = [chatUser.rId, userData.id]

        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, 'chats', id)
          const userChatsSnapshot = await getDoc(userChatsRef)

          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data()
            const chatIndex = userChatData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            )
            userChatData.chatsData[chatIndex].lastMessage = input.slice(0, 30)
            userChatData.chatsData[chatIndex].updatedAt = Date.now()
            if (userChatData.chatsData[chatIndex].rId === userData.id) {
              userChatData.chatsData[chatIndex].messageSeen = false
            }
            await updateDoc(userChatsRef, {
              chatsData: userChatData.chatsData,
            })
          }
        })
      }
      console.log(sendMessage)
    } catch (error) {
      toast.error(error.message)
    }
    setInput('')
  }

  const sendImage = async (e) => {
    try {
      const fileUrl = await uploadToCloudinary(e.target.files[0])
      if (fileUrl && messagesId) {
        await updateDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: new Date(),
          }),
        })

        const userIDs = [chatUser.rId, userData.id]

        userIDs.forEach(async (id) => {
          const userChatsRef = doc(db, 'chats', id)
          const userChatsSnapshot = await getDoc(userChatsRef)

          if (userChatsSnapshot.exists()) {
            const userChatData = userChatsSnapshot.data()
            const chatIndex = userChatData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            )
            userChatData.chatsData[chatIndex].lastMessage = 'image'
            userChatData.chatsData[chatIndex].updatedAt = Date.now()
            if (userChatData.chatsData[chatIndex].rId === userData.id) {
              userChatData.chatsData[chatIndex].messageSeen = false
            }
            await updateDoc(userChatsRef, {
              chatsData: userChatData.chatsData,
            })
          }
        })
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const convertTimestamp = (timestamp) => {
    let date = timestamp.toDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    if (hour > 12) {
      return hour - 12 + ':' + minute + ' PM'
    } else {
      return hour + ':' + minute + ' AM'
    }
  }

  return chatUser ? (
    <div className={`chat-box ${chatVisible? "":"hidden"}`}>
      <div className="chat-user">
        {/* <img src={chatUser.userData.avatar} alt="" /> */}
        <img src={chatUser.userData.avatar || assets.avatar_icon} alt="profile" />
        <p>
          {chatUser.userData.name}{' '}
          {Date.now() - chatUser.userData.lastSeen <= 70000 ? <img className="dot" src={assets.green_dot} alt="" />: null}
        </p>
        <img className='help' src={assets.help_icon} alt="" />
        <img onClick={()=>setChatVisible(false)} src={assets.arrow_icon} className='arrow' alt=""  />
      </div>

      <div className="chat-msg">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sId === userData.id ? 's-msg' : 'r-msg'}
          >
            {msg.text && <p className="msg">{msg.text}</p>}
            {msg.image && (
              <img className="msg-img" src={msg.image} alt="sent" />
            )}
            <div>
              {/* <img src={msg.sId === userData.id? userData.avatar: chatUser.userData.avatar}alt=""/> */}
              <img 
  src={
    msg.sId === userData.id
      ? (userData.avatar || assets.avatar_icon)
      : (chatUser.userData.avatar || assets.avatar_icon)
  }
  alt="profile"
/>

              <p>{convertTimestamp(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          onChange={(e) => setInput(e.target.value)}
          value={input}
          type="text"
          placeholder="Send a message"
        />
        <input
          onChange={sendImage}
          type="file"
          id="image"
          accept="image/png, image/jpeg"
          hidden
        />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="" />
        </label>
        {uploading ? (
          <p>Uploading...</p>
        ) : (
          <img onClick={sendMessage} src={assets.send_button} alt="" />
        )}
      </div>
    </div>
  ) : (
    <div className={`chat-welcome ${chatVisible? "":"hidden"}`}>
      <img src={assets.logo_icon} alt="" />
      <p>Chat anytime, anywhere</p>
    </div>
  )
}

export default ChatBox
