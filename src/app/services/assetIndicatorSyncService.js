/* eslint-disable no-continue */
import loggerFactory from '../../utils/logger.js';
import { fetchCandles } from '../../utils/candles.js';
import {
  listAssets,
  updateAssetIndicators,
} from '../../database/repositories/assetRepository.js';
import strategy from '../../config/strategy.js';

const MIN_CANDLES_REQUIRED = 3;

function intervalToMs(interval) {
  if (!interval) {
    return null;
  }

  const match = /^(\d+)([mhd])$/i.exec(interval.trim());
  if (!match) {
    return null;
  }

  const [, amount, unit] = match;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const multiplier = {
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }[unit.toLowerCase()];

  return multiplier ? value * multiplier : null;
}

const STRATEGY_INTERVAL_MS = intervalToMs(strategy.interval);

/**
 * Synchronise EMA indicators and unix timestamp for registered assets.
 * @param {{ logger?: import('pino').Logger }} [options]
 */
export async function syncAssetIndicators(options = {}) {
  const baseLogger = options.logger ?? loggerFactory;
  const log =
    typeof baseLogger.child === 'function'
      ? baseLogger.child({ contexto: 'indicator-sync' })
      : baseLogger;

  log.debug('[IndicatorSync] Iniciando sincronizacao dos indicadores...');

  const assets = await listAssets();
  log.debug(
    { totalAssets: assets.length },
    '[IndicatorSync] Ativos carregados para processamento'
  );

  const updatedSymbols = [];

  for (const asset of assets) {
    const storedUnix =
      asset.unixCurrentCandle != null ? Number(asset.unixCurrentCandle) : null;

    if (STRATEGY_INTERVAL_MS != null) {
      const expectedCloseTime =
        Math.floor(Date.now() / STRATEGY_INTERVAL_MS) * STRATEGY_INTERVAL_MS;

      if (storedUnix != null && storedUnix >= expectedCloseTime) {
        log.debug(
          {
            symbol: asset.symbol,
            storedUnix,
            expectedCloseTime,
          },
          '[IndicatorSync] Candle atual ja processado; pulando requisicao'
        );
        continue;
      }
    }

    const candles = await fetchCandles({ symbol: asset.symbol });

    if (candles.length < MIN_CANDLES_REQUIRED) {
      log.warn(
        { symbol: asset.symbol, candles: candles.length },
        '[IndicatorSync] Candles insuficientes; ativo ignorado'
      );
      continue;
    }

    const [latest, previous, previous2] = candles;
    const latestCloseTime = latest?.closeTimeMs ?? null;

    if (latestCloseTime === asset.unixCurrentCandle) {
      log.debug(
        { symbol: asset.symbol },
        '[IndicatorSync] Candle atual ja processado'
      );
      continue;
    }

    log.debug(
      {
        symbol: asset.symbol,
        previousUnix: storedUnix,
        newUnix: latestCloseTime,
        emaFast1: previous?.emaFast ?? null,
        emaFast2: previous2?.emaFast ?? null,
        emaSlow1: previous?.emaSlow ?? null,
        emaSlow2: previous2?.emaSlow ?? null,
      },
      '[IndicatorSync] Atualizando indicadores com novos candles'
    );

    await updateAssetIndicators(asset.symbol, {
      unixCurrentCandle: latestCloseTime,
      emaFast1: previous?.emaFast ?? null,
      emaFast2: previous2?.emaFast ?? null,
      emaSlow1: previous?.emaSlow ?? null,
      emaSlow2: previous2?.emaSlow ?? null,
    });

    updatedSymbols.push(asset.symbol);
  }

  log.info(
    { atualizados: updatedSymbols.length },
    '[IndicatorSync] Sincronizacao concluida'
  );

  return updatedSymbols;
}

export default {
  syncAssetIndicators,
};
