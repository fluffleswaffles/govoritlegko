'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'coins', {
      type: Sequelize.INTEGER,
      defaultValue: 100,
      allowNull: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'coins');
  }
};