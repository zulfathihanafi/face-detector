import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

function App() {
  const videoRef = useRef();
  const [name, setName] = useState('');

  useEffect(() => {
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]).then(startVideo);
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => videoRef.current.srcObject = stream);
  };

  const getEmbedding = async () => {
    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return Array.from(detection.descriptor);
  };

  const register = async () => {
    const embedding = await getEmbedding();
    await fetch('http://localhost:4000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, embedding })
    });
    alert('Registered');
  };

  const recognize = async () => {
    const embedding = await getEmbedding();
    const res = await fetch('http://localhost:4000/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding })
    });
    const data = await res.json();
    alert(data.allowed ? `Allowed: ${data.name}` : '❌ Not Allowed');
  };

  return (
    <div>
      <h2>Face Recognition Demo</h2>
      <video ref={videoRef} autoPlay width="320" />
      <br />
      <input placeholder="Name" onChange={e => setName(e.target.value)} />
      <button onClick={register}>Register</button>
      <button onClick={recognize}>Recognize</button>
    </div>
  );
}

export default App;
