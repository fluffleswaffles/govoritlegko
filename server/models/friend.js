const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Friend = sequelize.define('Friend', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    friendId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  }, {
    tableName: 'Friends',
    timestamps: false
  });
  return Friend;
};
