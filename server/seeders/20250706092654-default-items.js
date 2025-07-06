'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Items', [
      {
        name: 'Лицо 1',
        type: 'face',
        imageUrl: '/assets/avatars/faces/default.png',
        isDefault: true,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Лицо 2',
        type: 'face',
        imageUrl: '/assets/avatars/faces/smiling.png',
        isDefault: true,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'Футболка',
        type: 'top',
        imageUrl: '/assets/avatars/tops/default.png',
        isDefault: true,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'Штаны',
        type: 'bottom',
        imageUrl: '/assets/avatars/bottom/default.png',
        isDefault: true,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Items', { isDefault: true });
  }
};