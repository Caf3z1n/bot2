import { Op } from 'sequelize';
import loggerFactory from '../../utils/logger.js';
import Asset from '../../database/models/Asset.js';
import Position from '../../database/models/Position.js';
import { initDatabase } from '../../database/index.js';
import { listAssets } from '../../database/repositories/assetRepository.js';
import { cancelAllOpenOrders } from '../../utils/binanceClient.js';

const STATUS_AWAITING_CROSS = Asset.Status.AWAITING_CROSS;
const POSITION_STATUS_CLOSED = Position.Status.CLOSED;

export async function resetBotState(options = {}) {
  const baseLogger = options.logger ?? loggerFactory;
  const log =
    typeof baseLogger?.child === 'function'
      ? baseLogger.child({ contexto: 'bot-reset' })
      : baseLogger;

  await initDatabase();

  const assets = await listAssets();
  const cancellation = {
    attempted: assets.length,
    succeeded: 0,
    failures: [],
  };

  for (const asset of assets) {
    try {
      await cancelAllOpenOrders({ symbol: asset.symbol });
      cancellation.succeeded += 1;
      log.info(
        { symbol: asset.symbol },
        '[BotReset] Ordens abertas canceladas'
      );
    } catch (error) {
      cancellation.failures.push(asset.symbol);
      log.warn(
        { symbol: asset.symbol, err: error },
        '[BotReset] Falha ao cancelar ordens abertas'
      );
    }
  }

  const [positionsClosed] = await Position.update(
    {
      status: POSITION_STATUS_CLOSED,
      exitTime: new Date(),
      tpOrderId: null,
      slOrderId: null,
    },
    {
      where: {
        status: {
          [Op.ne]: POSITION_STATUS_CLOSED,
        },
      },
    }
  );

  const [assetUpdates] = await Asset.update(
    {
      status: STATUS_AWAITING_CROSS,
      side: null,
      triggerPrice: null,
      candleCrossTime: null,
      orderId: null,
    },
    {
      where: {},
    }
  );

  log.info(
    {
      assetsProcessed: assets.length,
      assetsReset: assetUpdates,
      positionsClosed,
      cancellations: cancellation,
    },
    '[BotReset] Rotina de reset concluida'
  );

  return {
    assetsProcessed: assets.length,
    assetsReset: assetUpdates,
    positionsClosed,
    cancellations: cancellation,
  };
}

export default {
  resetBotState,
};
