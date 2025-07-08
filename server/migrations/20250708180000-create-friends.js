module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Friends', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      friendId: { type: Sequelize.INTEGER, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Friends');
  }
};
