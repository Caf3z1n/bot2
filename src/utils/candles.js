import { format } from 'date-fns';
import { EMA } from 'technicalindicators';

import strategy from '../config/strategy.js';
import { fetchRecentKlines } from './binanceClient.js';

const EMA_FAST_PERIOD = strategy.emaFastPeriod;
const EMA_SLOW_PERIOD = strategy.emaSlowPeriod;
const DEFAULT_INTERVAL = strategy.interval;
const DEFAULT_LIMIT = Math.max(strategy.minimumCandles);

/**
 * @typedef {Object} CandleWithIndicators
 * @property {string} openTime
 * @property {string} closeTime
 * @property {number} openTimeMs
 * @property {number} closeTimeMs
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 * @property {number|null} emaFast
 * @property {number|null} emaSlow
 */

function assignIndicatorSeries(bars, series, key) {
  if (!Array.isArray(series) || series.length === 0) return;
  const offset = bars.length - series.length;
  series.forEach((value, index) => {
    const bar = bars[index + offset];
    if (!bar) return;
    const numeric = Number.parseFloat(value);
    bar[key] = Number.isFinite(numeric) ? Number(numeric.toFixed(8)) : null;
  });
}

/**
 * Recupera candles do símbolo informado e enriquece com EMA rápida/lenta.
 * @param {{symbol: string, interval?: string, limit?: number}} params
 * @returns {Promise<CandleWithIndicators[]>}
 */
export async function fetchCandles({
  symbol,
  interval = DEFAULT_INTERVAL,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!symbol) {
    throw new Error('symbol is required');
  }

  const rawCandles = await fetchRecentKlines(symbol, interval, { limit });
  if (!rawCandles.length) {
    return [];
  }

  const bars = rawCandles.map((candle) => ({
    openTime: format(new Date(candle.openTime), 'dd/MM/yyyy HH:mm'),
    closeTime: format(new Date(candle.closeTime), 'dd/MM/yyyy HH:mm'),
    openTimeMs: Number(candle.openTime),
    closeTimeMs: Number(candle.closeTime),
    open: Number.parseFloat(candle.open),
    high: Number.parseFloat(candle.high),
    low: Number.parseFloat(candle.low),
    close: Number.parseFloat(candle.close),
    volume: Number.parseFloat(candle.volume),
    emaFast: null,
    emaSlow: null,
  }));

  const closes = bars.map((bar) => bar.close);

  const emaFastSeries =
    closes.length >= EMA_FAST_PERIOD
      ? EMA.calculate({ period: EMA_FAST_PERIOD, values: closes })
      : [];
  assignIndicatorSeries(bars, emaFastSeries, 'emaFast');

  const emaSlowSeries =
    closes.length >= EMA_SLOW_PERIOD
      ? EMA.calculate({ period: EMA_SLOW_PERIOD, values: closes })
      : [];
  assignIndicatorSeries(bars, emaSlowSeries, 'emaSlow');

  return bars.reverse();
}

export default {
  fetchCandles,
};
