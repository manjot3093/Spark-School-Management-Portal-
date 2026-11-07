const { pipeline } = require('node:stream');

class CloudinaryStorage {
  constructor({ cloudinary, params }) {
    this.cloudinary = cloudinary;
    this.params = params;
  }

  async _handleFile(req, file, callback) {
    try {
      const options = typeof this.params === 'function' ? await this.params(req, file) : this.params;
      const type = options.resource_type || 'image';
      if ((type === 'image' && !file.mimetype.startsWith('image/')) ||
          (type === 'video' && !file.mimetype.startsWith('video/'))) {
        file.stream.resume();
        return callback(new Error('Unsupported upload type'));
      }
      let streamComplete = false;
      let result;
      let completed = false;
      const finish = (error, value) => {
        if (completed) return;
        if (error) { completed = true; return callback(error); }
        if (streamComplete && value) {
          completed = true;
          callback(null, { path: value.secure_url, filename: value.public_id,
            size: value.bytes, resource_type: value.resource_type });
        }
      };
      const upload = this.cloudinary.uploader.upload_stream(options, (error, value) => {
        if (error) return finish(error);
        if (!value?.secure_url || !value?.public_id) return finish(new Error('Upload returned no file'));
        result = value;
        finish(null, result);
      });
      pipeline(file.stream, upload, error => {
        if (error) return finish(error);
        streamComplete = true;
        finish(null, result);
      });
    } catch (error) {
      file.stream.resume();
      callback(error);
    }
  }

  _removeFile(req, file, callback) {
    if (!file.filename) return callback(null);
    this.cloudinary.uploader.destroy(file.filename,
      { resource_type: file.resource_type || 'image' }, callback);
  }
}

module.exports = { CloudinaryStorage };
