const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'printmart/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

// Design files: PDF, PNG, JPG, AI (stored as-is, no transformation)
const designStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'printmart/designs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
  },
});

const upload = multer({ storage });
const uploadDesign = multer({ storage: designStorage, limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = { cloudinary, upload, uploadDesign };
