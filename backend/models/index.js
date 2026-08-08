/**
 * Barrel export — import any model from one place:
 *   const { User, Startup, Investment } = require('../models');
 */
module.exports = {
  User:                require("./User.model"),
  Profile:             require("./Profile.model"),
  Category:            require("./Category.model"),
  Startup:             require("./Startup.model"),
  StartupMember:       require("./StartupMember.model"),
  StartupFile:         require("./StartupFile.model"),
  Connection:          require("./Connection.model"),
  Post:                require("./Post.model"),
  PostComment:         require("./PostComment.model"),
  PostLike:            require("./PostLike.model"),
  Conversation:        require("./Conversation.model"),
  Message:             require("./Message.model"),
  Investment:          require("./Investment.model"),
  VerificationRequest: require("./VerificationRequest.model"),
  Notification:        require("./Notification.model"),
  SavedStartup:        require("./SavedStartup.model"),
  StartupFollower:     require("./StartupFollower.model"),
};
