const multer = require('multer');

// Use memory storage so files are available as buffers on req.file.buffer
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

module.exports = upload;
