import React, { useContext, useEffect, useState } from 'react';
import './ProfileUpdate.css';
import assets from '../../assets/assets';
import axios from 'axios';
import { toast } from 'react-toastify';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { AppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const ProfileUpdate = () => {
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [prevImage, setPrevImage] = useState(null);

  const { userData, setUserData } = useContext(AppContext);
  const navigate = useNavigate();

  // ✅ Pre-fill user info when page loads
  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setBio(userData.bio || '');
      setPrevImage(userData.avatar || null);
    }
  }, [userData]);

  // ✅ Cloudinary upload
  const uploadImageToCloudinary = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'chat-app');
    data.append('cloud_name', 'djpgslb4a');

    try {
      setUploading(true);
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/djpgslb4a/image/upload',
        data
      );
      setUploading(false);
      return res.data.secure_url;
    } catch (error) {
      setUploading(false);
      console.error('Upload failed:', error);
      toast.error('Image upload failed');
      return null;
    }
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let imageUrl = prevImage; // fallback to existing avatar

      if (image) {
        imageUrl = await uploadImageToCloudinary(image);
      }

      const user = auth.currentUser;
      if (!user) {
        toast.error('No user logged in');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        bio,
        avatar: imageUrl || '',
      });

      const snap = await getDoc(userRef);
      setUserData(snap.data());

      toast.success('Profile updated successfully!');
      navigate('/chat');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="profile">
      <div className="profile-container">
        <form onSubmit={handleSubmit}>
          <h3>Profile Details</h3>

          <label htmlFor="avatar">
            <input
              onChange={(e) => setImage(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
              
            />
            <img
              src={
                image
                  ? URL.createObjectURL(image)
                  : prevImage
                  ? prevImage
                  : assets.avatar_icon
              }
              alt="Profile"
            />
            {uploading ? 'Uploading...' : 'Upload Profile Image'}
          </label>

          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <textarea
            placeholder="Write Profile Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
          ></textarea>

          <button type="submit" disabled={uploading}>
            {uploading ? 'Saving...' : 'Save'}
          </button>
        </form>

        <img
          className="profile-pic"
          src={
            image
              ? URL.createObjectURL(image)
              : prevImage
              ? prevImage
              : assets.logo_icon
          }
          alt="Preview" 
        />
      </div>
    </div>
  );
};

export default ProfileUpdate;
