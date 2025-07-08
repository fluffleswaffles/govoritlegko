'use strict';
module.exports = (sequelize, DataTypes) => {
  const FriendRequest = sequelize.define('FriendRequest', {
    userId: { // кто отправил
      type: DataTypes.INTEGER,
      allowNull: false
    },
    friendId: { // кому
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),
      defaultValue: 'pending',
      allowNull: false
    }
  }, {
    tableName: 'FriendRequests',
    timestamps: true
  });
  return FriendRequest;
};
