const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Achievement = sequelize.define('Achievement', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reward: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'Achievements',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'description'] 
      }
    ]
  });

  return Achievement;
};
