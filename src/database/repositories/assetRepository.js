import Asset from '../models/Asset.js';
import { initDatabase } from '../index.js';

/**
 * @typedef {Object} AssetRecord
 * @property {number} id
 * @property {string} symbol
 * @property {string} status
 * @property {('long'|'short'|null)} side
 * @property {string|null} emaFast2
 * @property {string|null} emaFast1
 * @property {string|null} emaSlow2
 * @property {string|null} emaSlow1
 * @property {string|null} candleCrossTime
 * @property {string|null} triggerPrice
 * @property {string|null} stepSize
 * @property {string|null} tickSize
 * @property {string|null} minQty
 * @property {string|null} maxNotional
 * @property {string|null} orderId
 * @property {number|null} unixCurrentCandle
 * @property {number|null} leverage
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Retorna todos os assets como objetos plain (sem metadata do Sequelize).
 * @returns {Promise<AssetRecord[]>}
 */
export async function listAssets() {
  await initDatabase();
  const assets = await Asset.findAll();
  return assets.map((asset) => asset.get({ plain: true }));
}

/**
 * Lista ativos filtrando por status.
 * @param {string} status
 * @returns {Promise<AssetRecord[]>}
 */
export async function listAssetsByStatus(status) {
  await initDatabase();
  const assets = await Asset.findAll({
    where: { status },
  });
  return assets.map((asset) => asset.get({ plain: true }));
}

/**
 * Atualiza campos de indicadores relacionados a candles recentes.
 * @param {string} symbol
 * @param {{
 *   emaFast2?: number|null,
 *   emaFast1?: number|null,
 *   emaSlow2?: number|null,
 *   emaSlow1?: number|null,
 *   unixCurrentCandle?: number|null
 * }} data
 * @returns {Promise<void>}
 */
export async function updateAssetIndicators(symbol, data = {}) {
  if (!symbol) {
    throw new Error('updateAssetIndicators requires a symbol');
  }

  await initDatabase();

  const payload = {
    emaFast2:
      data.emaFast2 != null && Number.isFinite(Number(data.emaFast2))
        ? Number(data.emaFast2)
        : null,
    emaFast1:
      data.emaFast1 != null && Number.isFinite(Number(data.emaFast1))
        ? Number(data.emaFast1)
        : null,
    emaSlow2:
      data.emaSlow2 != null && Number.isFinite(Number(data.emaSlow2))
        ? Number(data.emaSlow2)
        : null,
    emaSlow1:
      data.emaSlow1 != null && Number.isFinite(Number(data.emaSlow1))
        ? Number(data.emaSlow1)
        : null,
    unixCurrentCandle:
      data.unixCurrentCandle != null &&
      Number.isFinite(Number(data.unixCurrentCandle))
        ? Number(data.unixCurrentCandle)
        : null,
  };

  await Asset.update(payload, {
    where: { symbol },
  });
}

/**
 * Atualiza trigger_price de um ativo.
 * @param {string} symbol
 * @param {number|null} triggerPrice
 * @returns {Promise<void>}
 */
export async function updateAssetTriggerPrice(symbol, triggerPrice) {
  if (!symbol) {
    throw new Error('updateAssetTriggerPrice requires a symbol');
  }

  await initDatabase();

  const value =
    triggerPrice != null && Number.isFinite(Number(triggerPrice))
      ? Number(triggerPrice)
      : null;

  await Asset.update(
    { triggerPrice: value },
    {
      where: { symbol },
    }
  );
}

/**
 * Atualiza filtros de negociacao (step size, tick size, min qty).
 * @param {string} symbol
 * @param {{
 *   stepSize?: number|null,
 *   tickSize?: number|null,
 *   minQty?: number|null,
 *   maxNotional?: number|null
 * }} data
 * @returns {Promise<void>}
 */
export async function updateAssetTradingFilters(symbol, data = {}) {
  if (!symbol) {
    throw new Error('updateAssetTradingFilters requires a symbol');
  }

  await initDatabase();

  const payload = {
    stepSize:
      data.stepSize != null && Number.isFinite(Number(data.stepSize))
        ? Number(data.stepSize)
        : null,
    tickSize:
      data.tickSize != null && Number.isFinite(Number(data.tickSize))
        ? Number(data.tickSize)
        : null,
    minQty:
      data.minQty != null && Number.isFinite(Number(data.minQty))
        ? Number(data.minQty)
        : null,
    maxNotional:
      data.maxNotional != null && Number.isFinite(Number(data.maxNotional))
        ? Number(data.maxNotional)
        : null,
    leverage:
      data.leverage != null && Number.isFinite(Number(data.leverage))
        ? Number(data.leverage)
        : null,
  };

  await Asset.update(payload, {
    where: { symbol },
  });
}

/**
 * Atualiza estado, side e metadados de cruzamento de um ativo.
 * @param {string} symbol
 * @param {{ status?: string, side?: 'long'|'short'|null, candleCrossTime?: Date|null }} data
 * @returns {Promise<void>}
 */
export async function updateAssetState(symbol, data = {}) {
  if (!symbol) {
    throw new Error('updateAssetState requires a symbol');
  }

  await initDatabase();

  await Asset.update(
    {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.side !== undefined ? { side: data.side } : {}),
      ...(data.candleCrossTime !== undefined
        ? { candleCrossTime: data.candleCrossTime }
        : {}),
      ...(data.orderId !== undefined ? { orderId: data.orderId } : {}),
    },
    {
      where: { symbol },
    }
  );
}

/**
 * Define a order_id associado a um ativo.
 * @param {string} symbol
 * @param {string|null} orderId
 * @returns {Promise<void>}
 */
export async function updateAssetOrderId(symbol, orderId) {
  await updateAssetState(symbol, { orderId });
}

/**
 * Busca um ativo pelo order_id associado.
 * @param {string|number} orderId
 * @returns {Promise<AssetRecord|null>}
 */
export async function findAssetByOrderId(orderId) {
  if (orderId === undefined || orderId === null || orderId === '') {
    throw new Error('findAssetByOrderId requires an orderId');
  }

  await initDatabase();
  const asset = await Asset.findOne({
    where: { orderId: String(orderId) },
  });

  return asset ? asset.get({ plain: true }) : null;
}
