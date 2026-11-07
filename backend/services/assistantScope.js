const mongoose = require('mongoose');

function conversationScope(user) {
  if (!user?._id || !mongoose.isValidObjectId(user._id) ||
      !user?.schoolId || !mongoose.isValidObjectId(user.schoolId)) return null;
  return { schoolId: user.schoolId, userId: user._id };
}

module.exports = { conversationScope };
