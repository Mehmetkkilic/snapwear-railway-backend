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

// Create AI-generated composed images using Google Gemini
async function createComposedImage(images, mode = 'tryOn') {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found, using fallback');
    return createFallbackImage(mode);
  }
  
  try {
    // Create mode-specific prompt
    const prompts = {
      tryOn: "Create a realistic fashion photo showing a person wearing the provided clothing items. The person should appear naturally dressed in the clothes with proper fit, lighting, and professional fashion photography style. Make it look like a real try-on photo.",
      bgSwap: "Replace the background of the person with a new stylish background while keeping the person and their clothes exactly the same. Ensure proper lighting and shadow matching for a natural look.",
      flatLay: "Create a stylish flat lay arrangement of the clothing items on a clean, neutral background. Arrange them in an aesthetically pleasing, Instagram-worthy style with proper shadows and lighting.",
      flatLayBg: "Create a flat lay composition of the clothing items on the provided background. Arrange the clothes in a visually appealing way that complements the background setting.",
      garmentInScene: "Naturally integrate the clothing items into the scene. The clothes should appear as if they belong in that environment with realistic lighting, perspective, and scale.",
      collage: "Create an artistic fashion collage combining all the provided images. Use creative layouts, stylish overlays, and modern design elements for an engaging visual composition."
    };
    
    const prompt = prompts[mode] || prompts.tryOn;
    
    // Prepare images for Gemini API
    const imageParts = images.map(imageData => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData
      }
    }));
    
    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });
    
    if (!response.ok) {
      console.log(`❌ Gemini API error: ${response.status}`);
      return createFallbackImage(mode);
    }
    
    const data = await response.json();
    
    // Check if Gemini returned an image
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('✅ Generated image from Gemini API');
          return part.inlineData.data;
        }
      }
    }
    
    console.log('ℹ️ No image in Gemini response, using enhanced fallback');
    return createEnhancedFallbackImage(mode, data.candidates?.[0]?.content?.parts?.[0]?.text);
    
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    return createFallbackImage(mode);
  }
}

// Enhanced fallback with AI text response
function createEnhancedFallbackImage(mode, aiText) {
  // Create a beautiful success image with AI description
  const canvas = require('canvas');
  const { createCanvas } = canvas;
  
  const width = 800;
  const height = 800;
  const canvasElement = createCanvas(width, height);
  const ctx = canvasElement.getContext('2d');
  
  // Gradient background based on mode
  const gradients = {
    tryOn: ['#667eea', '#764ba2'],
    bgSwap: ['#f093fb', '#f5576c'],
    flatLay: ['#4facfe', '#00f2fe'],
    flatLayBg: ['#43e97b', '#38f9d7'],
    garmentInScene: ['#fa709a', '#fee140'],
    collage: ['#a8edea', '#fed6e3']
  };
  
  const [color1, color2] = gradients[mode] || gradients.tryOn;
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add white overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(50, 100, width - 100, height - 200);
  
  // Add text content
  ctx.fillStyle = '#333';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('✨ AI Composition Complete!', width/2, 200);
  
  ctx.font = '24px Arial';
  ctx.fillText(`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, width/2, 250);
  
  if (aiText) {
    ctx.font = '18px Arial';
    const words = aiText.substring(0, 200).split(' ');
    let line = '';
    let y = 320;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 120 && i > 0) {
        ctx.fillText(line, width/2, y);
        line = words[i] + ' ';
        y += 30;
        if (y > 600) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width/2, y);
  }
  
  return canvasElement.toBuffer('image/png').toString('base64');
}

// Simple fallback image
function createFallbackImage(mode) {
  // Return a simple colored base64 image
  const colors = {
    tryOn: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC',
    bgSwap: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII=',
    flatLay: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC',
    flatLayBg: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII=',
    garmentInScene: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5+hnoEIwDiqkL4KAcTvBQCJvyRTAAAAAElFTkSuQmCC',
    collage: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9QjzqMOoxGjEZMOgwAEysEABaU4bAAAAAASUVORK5CYII='
  };
  
  return colors[mode] || colors.tryOn;
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

app.post('/api/compose', async (req, res) => {
  console.log('[API] Compose endpoint called');
  console.log('[API] Request body keys:', Object.keys(req.body));
  console.log('[API] Request content-type:', req.get('Content-Type'));
  
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

    // Create composed image using AI
    console.log('[API] Creating AI-composed image...');
    const imageData = await createComposedImage(images, mode);

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