module.exports = {
  async up(queryInterface) {
    const { default: strategy } = await import('../../config/strategy.js');
    const symbols = strategy.symbols ?? [];

    if (symbols.length === 0) {
      throw new Error(
        '[seed:strategy-assets] Nenhum simbolo configurado em BOT2_SYMBOLS'
      );
    }

    const now = new Date();
    const rows = symbols.map((symbol) => ({
      symbol,
      status: 'awaiting_cross',
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('assets', rows, {});
  },

  async down(queryInterface) {
    const { default: strategy } = await import('../../config/strategy.js');
    const symbols = strategy.symbols ?? [];

    if (!symbols.length) {
      return;
    }

    await queryInterface.bulkDelete(
      'assets',
      {
        symbol: symbols,
      },
      {}
    );
  },
};
