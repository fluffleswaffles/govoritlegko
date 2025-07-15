'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Achievements', ['userId', 'description'], {
      unique: true,
      name: 'unique_user_reward'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Achievements', 'unique_user_reward');
  }
};
