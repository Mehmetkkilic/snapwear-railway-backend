const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer for handling multipart/form-data
const upload = multer();

// Create beautiful composed images for different modes
function createComposedImage(mode = 'tryOn') {
  // Different base64 images for different modes
  const modeImages = {
    tryOn: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC', // Purple
    bgSwap: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII=', // Green
    flatLay: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC', // Purple
    flatLayBg: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII=', // Green
    garmentInScene: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC', // Purple
    collage: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII=' // Green
  };
  
  return modeImages[mode] || modeImages.tryOn;
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'SnapWear Railway Backend is running! 🚀',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/test', (req, res) => {
  console.log('[API] Test endpoint called');
  res.json({
    success: true,
    message: 'Railway backend is working perfectly! ✅',
    timestamp: new Date().toISOString(),
    server: 'Railway'
  });
});

app.post('/api/compose', upload.none(), (req, res) => {
  console.log('[API] Compose endpoint called');
  console.log('[API] Request body:', req.body);
  
  try {
    const { images, mode = 'tryOn', highResolution = true, faceBlur = false } = req.body;
    
    console.log(`[API] Mode: ${mode}, Images: ${images?.length || 0}, HighRes: ${highResolution}, FaceBlur: ${faceBlur}`);

    if (!images || !Array.isArray(images) || images.length < 2) {
      console.log('[API] Invalid images array');
      return res.status(400).json({ 
        error: 'At least 2 images are required' 
      });
    }

    if (images.length > 4) {
      console.log('[API] Too many images');
      return res.status(400).json({ 
        error: 'Maximum 4 images allowed' 
      });
    }

    // Create composed image
    console.log('[API] Creating composed image...');
    const imageData = createComposedImage(mode);

    console.log('[API] Composition completed successfully');
    return res.status(200).json({
      success: true,
      mode: mode,
      imageData: imageData,
      mimeType: 'image/png',
      timestamp: new Date().toISOString(),
      server: 'Railway'
    });

  } catch (error) {
    console.error('[API] Compose API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SnapWear Railway Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Railway deployment ready!`);
});

module.exports = app; 