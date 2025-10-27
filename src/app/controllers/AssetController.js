import { listAssets } from '../../database/repositories/assetRepository.js';
import Asset from '../../database/models/Asset.js';
import { initDatabase } from '../../database/index.js';

class AssetController {
  static async index(req, res) {
    const assets = await listAssets();
    return res.json({ assets });
  }

  static async update(req, res) {
    await initDatabase();
    const { symbol } = req.query;
    const asset = await Asset.findOne({ where: { symbol } });

    await asset.update({
      candleCrossTime: new Date(),
    });
    return res.json({ asset });
  }
}

export default AssetController;
