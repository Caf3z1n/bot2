import { listAssets } from '../../database/repositories/assetRepository.js';
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
        try {
          if (!asset?.symbol) {
            return { ...asset, currentPrice: null };
          }

          const pricePayload = await fetchMarkPrice(asset.symbol);
          const currentPrice = toNumber(pricePayload?.markPrice);
          return { ...asset, currentPrice };
        } catch (error) {
          return { ...asset, currentPrice: null };
        }
      })
    );

    return res.json({ assets: assetsWithPrice });
  }
}

export default AssetController;
