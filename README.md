# SnapWear Railway Backend

Railway üzerinde çalışan Express.js backend API'si.

## Özellikler

- ✅ Express.js server
- ✅ CORS desteği
- ✅ Image composition API
- ✅ Mode-based responses
- ✅ Railway deployment ready

## API Endpoints

### GET /
Ana sayfa - server durumu

### GET /api/test
Test endpoint - backend sağlığını kontrol eder

### POST /api/compose
Görsel kompozisyon endpoint'i

**Request:**
```json
{
  "images": ["base64_image_1", "base64_image_2"],
  "mode": "tryOn",
  "highResolution": true,
  "faceBlur": false
}
```

**Response:**
```json
{
  "success": true,
  "mode": "tryOn",
  "imageData": "base64_composed_image",
  "mimeType": "image/png",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "server": "Railway"
}
```

## Deployment

1. Railway hesabı oluştur
2. GitHub repo bağla
3. Otomatik deploy

## Local Development

```bash
npm install
npm run dev
``` 