const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const { CloudinaryStorage } = require('../utils/cloudinaryStorage');

test('Cloudinary storage returns the same file fields used by existing controllers', async () => {
  const uploader = {
    upload_stream(options, callback) {
      assert.equal(options.folder, 'school-portal/test');
      return new Writable({
        write(chunk, encoding, next) { next(); },
        final(next) {
          callback(null, { secure_url: 'https://example.test/file.jpg', public_id: 'test/file', bytes: 3, resource_type: 'image' });
          next();
        }
      });
    }
  };
  const storage = new CloudinaryStorage({ cloudinary: { uploader }, params: { folder: 'school-portal/test' } });
  const file = { mimetype: 'image/jpeg', stream: Readable.from(Buffer.from('abc')) };
  const result = await new Promise((resolve, reject) => storage._handleFile({}, file, (error, value) => error ? reject(error) : resolve(value)));
  assert.deepEqual(result, { path: 'https://example.test/file.jpg', filename: 'test/file', size: 3, resource_type: 'image' });
});
