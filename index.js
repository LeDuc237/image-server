const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
// Configure Cloudinary
// ✅ Correct (synchronous configuration)
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Cloudinary config failed:', error);
  process.exit(1);
}

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'user-profiles',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, // Better filename generation
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    };
  }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("Image Server is Running 🚀");
});

// Add this after your routes
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});


// Upload endpoint
app.post('/uploads', upload.single('profilePhoto'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the Cloudinary public ID from the correct property
    const publicId = req.file.filename; // Changed from public_id to filename
    
    // Extract filename without folder path
    const fileName = publicId.includes('/') 
      ? publicId.split('/').pop() 
      : publicId;

    res.status(200).json({
      fileName: fileName,
      imageUrl: req.file.path
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete endpoint
app.delete('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'No public ID provided' });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.status(200).json({ message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
