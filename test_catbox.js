const fs = require('fs');

async function testUpload() {
  const vttContent = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:05.000\nHello World!";
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', new Blob([vttContent], { type: 'text/vtt' }), 'sub.vtt');

  try {
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });
    const url = await res.text();
    console.log("Uploaded URL:", url);
  } catch (e) {
    console.error("Upload failed:", e);
  }
}

testUpload();
