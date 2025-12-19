const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer via upload_stream to avoid writing to disk
function uploadBuffer(buffer, filename, folder = 'products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

module.exports = {
  uploadBuffer,
  cloudinary,
};
