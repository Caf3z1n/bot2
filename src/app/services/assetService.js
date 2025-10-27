import loggerFactory from '../../utils/logger.js';
import Asset from '../../database/models/Asset.js';
import {
  listAssetsByStatus,
  updateAssetOrderId,
  updateAssetState,
  updateAssetTriggerPrice,
} from '../../database/repositories/assetRepository.js';
import { cancelAllOpenOrders } from '../../utils/binanceClient.js';
import strategy from '../../config/strategy.js';

const STATUS_AWAITING_CROSS = Asset.Status.AWAITING_CROSS;
const STATUS_AWAITING_PULLBACK = Asset.Status.AWAITING_PULLBACK;
const STATUSES_TO_EVALUATE = [STATUS_AWAITING_CROSS, STATUS_AWAITING_PULLBACK];

const SIDE_LONG = Asset.Side.LONG;
const SIDE_SHORT = Asset.Side.SHORT;

const penetrationFraction =
  Number(strategy?.pullback?.penetrationPct ?? 0) / 100;

const MULTIPLIERS = {
  [SIDE_LONG]: 1 - penetrationFraction,
  [SIDE_SHORT]: 1 + penetrationFraction,
};

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function detectCross(emaFast2, emaFast1, emaSlow2, emaSlow1) {
  if (
    !Number.isFinite(emaFast2) ||
    !Number.isFinite(emaFast1) ||
    !Number.isFinite(emaSlow2) ||
    !Number.isFinite(emaSlow1)
  ) {
    return null;
  }

  const crossedUp = emaFast2 < emaSlow2 && emaFast1 > emaSlow1;
  if (crossedUp) {
    return SIDE_LONG;
  }

  const crossedDown = emaFast2 > emaSlow2 && emaFast1 < emaSlow1;
  if (crossedDown) {
    return SIDE_SHORT;
  }

  return null;
}

function createLogger(baseLogger, contexto) {
  if (baseLogger && typeof baseLogger.child === 'function') {
    return baseLogger.child({ contexto });
  }
  return baseLogger ?? loggerFactory;
}

async function cancelExistingOrders(symbol, log) {
  try {
    const payload = await cancelAllOpenOrders({ symbol });
    log.info(
      { symbol, cancelResult: payload },
      '[AssetService] Ordens abertas canceladas antes de reiniciar o sinal'
    );
    return true;
  } catch (error) {
    log.error(
      { symbol, err: error },
      '[AssetService] Falha ao cancelar ordens abertas; mantendo sinal atual'
    );
    return false;
  }
}

function snapPrice(rawPrice, tickSize, side) {
  const step = tickSize > 0 ? tickSize : 1;

  if (side === SIDE_LONG) {
    return Math.ceil(rawPrice / step - Number.EPSILON) * step;
  }

  return Math.floor(rawPrice / step + Number.EPSILON) * step;
}

/**
 * Processa o fluxo completo de deteccao de cruzamentos e ajuste do trigger price.
 * @param {{ logger?: import('pino').Logger }} [options]
 */
export async function processAssetSignals(options = {}) {
  const baseLogger = options.logger ?? loggerFactory;
  const log = createLogger(baseLogger, 'asset-service');

  log.info('[AssetService] Iniciando processamento de sinais de ativos');

  const assetsByStatus = await Promise.all(
    STATUSES_TO_EVALUATE.map((status) => listAssetsByStatus(status))
  );
  const assets = assetsByStatus.flat();
  const statusSummary = STATUSES_TO_EVALUATE.reduce((acc, status, index) => {
    acc[status] = assetsByStatus[index].length;
    return acc;
  }, {});

  log.debug(
    { totalAssets: assets.length, statusSummary },
    '[AssetService] Ativos aguardando avaliacao carregados'
  );

  let statusTransitions = 0;
  let triggersUpdated = 0;

  for (const asset of assets) {
    const emaFast2 = toNumber(asset.emaFast2);
    const emaFast1 = toNumber(asset.emaFast1);
    const emaSlow2 = toNumber(asset.emaSlow2);
    const emaSlow1 = toNumber(asset.emaSlow1);
    const tickSize = toNumber(asset.tickSize);
    const storedTrigger = toNumber(asset.triggerPrice);
    const currentSide = asset.side;

    const canComputeTrigger =
      asset.status === STATUS_AWAITING_PULLBACK &&
      Number.isFinite(emaFast1) &&
      Number.isFinite(tickSize) &&
      Number.isFinite(MULTIPLIERS[currentSide]);

    let triggerChanged = false;

    if (canComputeTrigger) {
      const multiplier = MULTIPLIERS[currentSide];
      const raw = emaFast1 * multiplier;
      const snapped = snapPrice(raw, tickSize, currentSide);
      const computed = Number(snapped.toFixed(8));
      const precisaAtualizar =
        storedTrigger == null || Math.abs(storedTrigger - computed) >= 1e-10;

      if (!precisaAtualizar) {
        log.debug(
          { symbol: asset.symbol, triggerPrice: storedTrigger },
          '[AssetService] Trigger_price permanece inalterado'
        );
      } else {
        await updateAssetTriggerPrice(asset.symbol, computed);
        triggersUpdated += 1;
        triggerChanged = true;

        log.debug(
          { symbol: asset.symbol, triggerPrice: computed, side: currentSide },
          '[AssetService] Trigger_price atualizado antes da avaliacao do cruzamento'
        );
      }
    } else if (asset.status === STATUS_AWAITING_PULLBACK) {
      log.debug(
        { symbol: asset.symbol, side: currentSide },
        '[AssetService] Dados insuficientes para calcular trigger_price'
      );
    }

    if (canComputeTrigger && !triggerChanged) {
      log.debug(
        { symbol: asset.symbol },
        '[AssetService] Trigger inalterado; pulando verificacao de cruzamento'
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    let ordersCancelled = false;

    if (triggerChanged) {
      const cancelled = await cancelExistingOrders(asset.symbol, log);
      if (!cancelled) {
        log.warn(
          { symbol: asset.symbol },
          '[AssetService] Trigger mudou mas cancelamento falhou; abortando cruzamento'
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      try {
        await updateAssetOrderId(asset.symbol, null);
        ordersCancelled = true;
      } catch (error) {
        log.error(
          { symbol: asset.symbol, err: error },
          '[AssetService] Falha ao zerar orderId apos cancelamento inicial'
        );
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    const hasAllEmas =
      emaFast2 !== null &&
      emaFast1 !== null &&
      emaSlow2 !== null &&
      emaSlow1 !== null;

    if (!hasAllEmas) {
      log.debug(
        { symbol: asset.symbol },
        '[AssetService] EMAs insuficientes para detectar cruzamento'
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const side = detectCross(emaFast2, emaFast1, emaSlow2, emaSlow1);

    if (!side) {
      log.debug(
        { symbol: asset.symbol },
        '[AssetService] Nenhum cruzamento valido detectado'
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!ordersCancelled) {
      const cancelled = await cancelExistingOrders(asset.symbol, log);
      if (!cancelled) {
        log.warn(
          { symbol: asset.symbol },
          '[AssetService] Pulando atualizacao por falha ao cancelar ordens antigas'
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      try {
        await updateAssetOrderId(asset.symbol, null);
        ordersCancelled = true;
      } catch (error) {
        log.error(
          { symbol: asset.symbol, err: error },
          '[AssetService] Falha ao zerar orderId antes de atualizar sinal'
        );
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    await updateAssetState(asset.symbol, {
      status: STATUS_AWAITING_PULLBACK,
      side,
      candleCrossTime: new Date(),
      orderId: null,
    });

    log.warn(
      { symbol: asset.symbol, side },
      '[AssetService] Cruzamento detectado; preparando pullback'
    );

    statusTransitions += 1;
  }

  log.info(
    {
      transicoesDeStatus: statusTransitions,
      triggersAtualizados: triggersUpdated,
    },
    '[AssetService] Processamento de ativos concluido'
  );

  return {
    crossesProcessed: statusTransitions,
    triggersProcessed: triggersUpdated,
  };
}

export default {
  processAssetSignals,
};
