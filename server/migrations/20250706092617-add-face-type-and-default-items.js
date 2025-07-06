'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "ALTER TABLE \"Items\" ALTER COLUMN \"type\" TYPE VARCHAR(255) USING \"type\"::VARCHAR(255);"
    );
    await queryInterface.changeColumn('Items', 'type', {
      type: Sequelize.ENUM('hair', 'top', 'bottom', 'accessory', 'face')
    });
    await queryInterface.addColumn('Items', 'isDefault', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Items', 'isDefault');
    await queryInterface.changeColumn('Items', 'type', {
      type: Sequelize.ENUM('hair', 'top', 'bottom', 'accessory')
    });
  }
};