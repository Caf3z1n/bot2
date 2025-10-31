import {
  listAssets,
  updateAssetBySymbol,
} from '../../database/repositories/assetRepository.js';
import { fetchMarkPrice } from '../../utils/binanceClient.js';

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

class AssetController {
  static async index(req, res) {
    const assets = await listAssets();

    const assetsWithPrice = await Promise.all(
      assets.map(async (asset) => {
        const triggerPrice = toNumber(asset?.triggerPrice);

        try {
          if (!asset?.symbol) {
            return {
              ...asset,
              currentPrice: null,
              triggerDiffPercent: null,
            };
          }

          const pricePayload = await fetchMarkPrice(asset.symbol);
          const currentPrice = toNumber(pricePayload?.markPrice);
          const triggerDiffPercent =
            currentPrice != null && triggerPrice != null && triggerPrice !== 0
              ? Math.abs(((currentPrice - triggerPrice) / triggerPrice) * 100)
              : null;

          return { ...asset, currentPrice, triggerDiffPercent };
        } catch (error) {
          return {
            ...asset,
            currentPrice: null,
            triggerDiffPercent: null,
          };
        }
      })
    );

    return res.json({ assets: assetsWithPrice });
  }

  static async update(req, res) {
    const rawSymbol =
      typeof req.query.symbol === 'string' ? req.query.symbol : '';
    const symbol = rawSymbol.trim().toUpperCase();

    if (!symbol) {
      return res
        .status(400)
        .json({ error: 'symbol query parameter is required' });
    }

    const changes = req.body ?? {};

    if (
      !changes ||
      typeof changes !== 'object' ||
      Object.keys(changes).length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'request body must include fields to update' });
    }

    try {
      const updated = await updateAssetBySymbol(symbol, changes);

      if (!updated) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const withPrice = await (async () => {
        try {
          const pricePayload = await fetchMarkPrice(updated.symbol);
          const currentPrice = toNumber(pricePayload?.markPrice);
          return { ...updated, currentPrice };
        } catch {
          return { ...updated, currentPrice: null };
        }
      })();

      return res.json({ asset: withPrice });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to update asset',
        details: error.message,
      });
    }
  }
}

export default AssetController;
