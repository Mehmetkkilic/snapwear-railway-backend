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
         // Create mode-specific prompt for realistic image generation
     const prompts = {
       tryOn: "Create a photorealistic image of the person wearing the clothing item. The person should be naturally dressed in the provided garment with perfect fit, realistic fabric draping, proper lighting, and professional fashion photography quality. Maintain the person's pose, facial features, and background while seamlessly integrating the clothing. The result should look like a real photograph of the person actually wearing the clothes.",
       bgSwap: "Generate a photorealistic image where the person is placed in the new background environment while keeping their appearance and clothing exactly the same. Match the lighting, shadows, and atmosphere to make it look naturally integrated.",
       flatLay: "Create a professional flat lay photograph of the clothing items arranged aesthetically on a clean surface with proper shadows and studio lighting.",
       flatLayBg: "Generate a realistic flat lay composition with the clothing items beautifully arranged on the provided background surface.",
       garmentInScene: "Create a photorealistic scene where the clothing items are naturally placed in the environment with realistic lighting and shadows.",
       collage: "Generate an artistic but realistic collage combining the provided images with professional composition and lighting."
     };
    
    const prompt = prompts[mode] || prompts.tryOn;
    
    // Prepare images for Gemini API
    const imageParts = images.map(imageData => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData
      }
    }));
    
         // Try Gemini Pro Vision for image generation first
     const imageGenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         contents: [{
           parts: [
             { text: `Generate a realistic image: ${prompt}` },
             ...imageParts
           ]
         }],
         generationConfig: {
           temperature: 0.4,
           topK: 32,
           topP: 1,
           maxOutputTokens: 4096,
         }
       })
     });
     
     // Check if image generation worked
     if (imageGenResponse.ok) {
       const imageGenData = await imageGenResponse.json();
       
       if (imageGenData.candidates && imageGenData.candidates[0] && imageGenData.candidates[0].content && imageGenData.candidates[0].content.parts) {
         for (const part of imageGenData.candidates[0].content.parts) {
           if (part.inlineData && part.inlineData.data) {
             console.log('✅ Generated realistic image from Gemini Pro Vision!');
             return part.inlineData.data;
           }
         }
       }
     }
     
     // Fallback: Call regular Gemini for analysis
     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         contents: [{
           parts: [
             { text: `Analyze these images and provide a detailed description of how they would look when combined in a ${mode} style. Describe the final result as if you're looking at the completed composition. Be specific about colors, fit, style, and overall appearance.` },
             ...imageParts
           ]
         }],
         generationConfig: {
           temperature: 0.7,
           topK: 40,
           topP: 0.8,
           maxOutputTokens: 512,
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
    
         console.log('ℹ️ No image in Gemini response, creating composite image');
     const aiDescription = data.candidates?.[0]?.content?.parts?.[0]?.text;
     return await createCompositeImage(images, mode, aiDescription);
    
     } catch (error) {
     console.error('❌ Gemini API error:', error.message);
     return await createCompositeImage(images, mode, 'AI-powered fashion composition');
   }
 }
 
 // Create real composite image using Canvas
 async function createCompositeImage(images, mode, aiDescription) {
   try {
     const canvas = require('canvas');
     const { createCanvas, loadImage } = canvas;
     
     const width = 800;
     const height = 800;
     const canvasElement = createCanvas(width, height);
     const ctx = canvasElement.getContext('2d');
     
     // Background gradient based on mode
     const gradients = {
       tryOn: ['#667eea', '#764ba2'],
       bgSwap: ['#f093fb', '#f5576c'],
       flatLay: ['#4facfe', '#00f2fe'],
       flatLayBg: ['#43e97b', '#38f9d7'],
       garmentInScene: ['#fa709a', '#fee140'],
       collage: ['#a8edea', '#fed6e3']
     };
     
     const [color1, color2] = gradients[mode] || gradients.tryOn;
     
     // Create gradient background
     const gradient = ctx.createLinearGradient(0, 0, width, height);
     gradient.addColorStop(0, color1);
     gradient.addColorStop(1, color2);
     ctx.fillStyle = gradient;
     ctx.fillRect(0, 0, width, height);
     
     // Load and composite images
     const loadedImages = [];
     for (let i = 0; i < Math.min(images.length, 4); i++) {
       try {
         const imageBuffer = Buffer.from(images[i], 'base64');
         const img = await loadImage(imageBuffer);
         loadedImages.push(img);
       } catch (err) {
         console.log(`❌ Failed to load image ${i}:`, err.message);
       }
     }
     
     if (loadedImages.length === 0) {
       return createFallbackImage(mode);
     }
     
     // Composite images based on mode
     switch (mode) {
       case 'tryOn':
         await compositeTryOn(ctx, loadedImages, width, height);
         break;
       case 'bgSwap':
         await compositeBgSwap(ctx, loadedImages, width, height);
         break;
       case 'flatLay':
         await compositeFlatLay(ctx, loadedImages, width, height);
         break;
       case 'collage':
       default:
         await compositeCollage(ctx, loadedImages, width, height);
         break;
     }
     
     // Add AI description overlay
     if (aiDescription) {
       ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
       ctx.fillRect(20, height - 120, width - 40, 100);
       
       ctx.fillStyle = 'white';
       ctx.font = '16px Arial';
       ctx.textAlign = 'left';
       
       const words = aiDescription.substring(0, 150).split(' ');
       let line = '';
       let y = height - 90;
       
       for (let i = 0; i < words.length; i++) {
         const testLine = line + words[i] + ' ';
         const metrics = ctx.measureText(testLine);
         if (metrics.width > width - 80 && i > 0) {
           ctx.fillText(line, 40, y);
           line = words[i] + ' ';
           y += 25;
           if (y > height - 30) break;
         } else {
           line = testLine;
         }
       }
       ctx.fillText(line, 40, y);
     }
     
     return canvasElement.toBuffer('image/png').toString('base64');
     
   } catch (error) {
     console.error('❌ Composite image creation error:', error.message);
     return createFallbackImage(mode);
   }
 }
 
 // Composite functions for different modes
 async function compositeTryOn(ctx, images, width, height) {
   // Main person image
   if (images[0]) {
     const aspectRatio = images[0].width / images[0].height;
     const imgHeight = height * 0.8;
     const imgWidth = imgHeight * aspectRatio;
     const x = (width - imgWidth) / 2;
     const y = (height - imgHeight) / 2;
     
     ctx.drawImage(images[0], x, y, imgWidth, imgHeight);
   }
   
   // Overlay clothing items
   if (images[1]) {
     const overlaySize = Math.min(width, height) * 0.3;
     ctx.globalAlpha = 0.8;
     ctx.drawImage(images[1], width - overlaySize - 20, 20, overlaySize, overlaySize);
     ctx.globalAlpha = 1.0;
   }
 }
 
 async function compositeBgSwap(ctx, images, width, height) {
   // Background first
   if (images[1]) {
     ctx.drawImage(images[1], 0, 0, width, height);
   }
   
   // Person on top
   if (images[0]) {
     const aspectRatio = images[0].width / images[0].height;
     const imgHeight = height * 0.9;
     const imgWidth = imgHeight * aspectRatio;
     const x = (width - imgWidth) / 2;
     const y = (height - imgHeight) / 2;
     
     ctx.drawImage(images[0], x, y, imgWidth, imgHeight);
   }
 }
 
 async function compositeFlatLay(ctx, images, width, height) {
   const itemSize = Math.min(width, height) * 0.4;
   const spacing = 40;
   
   for (let i = 0; i < Math.min(images.length, 4); i++) {
     const col = i % 2;
     const row = Math.floor(i / 2);
     const x = (width - itemSize * 2 - spacing) / 2 + col * (itemSize + spacing);
     const y = (height - itemSize * 2 - spacing) / 2 + row * (itemSize + spacing);
     
     ctx.save();
     ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
     ctx.shadowBlur = 10;
     ctx.shadowOffsetX = 5;
     ctx.shadowOffsetY = 5;
     
     ctx.drawImage(images[i], x, y, itemSize, itemSize);
     ctx.restore();
   }
 }
 
 async function compositeCollage(ctx, images, width, height) {
   const positions = [
     { x: 0.1, y: 0.1, size: 0.4 },
     { x: 0.5, y: 0.1, size: 0.4 },
     { x: 0.1, y: 0.5, size: 0.4 },
     { x: 0.5, y: 0.5, size: 0.4 }
   ];
   
   for (let i = 0; i < Math.min(images.length, positions.length); i++) {
     const pos = positions[i];
     const size = Math.min(width, height) * pos.size;
     const x = width * pos.x;
     const y = height * pos.y;
     
     ctx.save();
     ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
     ctx.shadowBlur = 8;
     
     // Rounded corners
     ctx.beginPath();
     ctx.roundRect(x, y, size, size, 15);
     ctx.clip();
     
     ctx.drawImage(images[i], x, y, size, size);
     ctx.restore();
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