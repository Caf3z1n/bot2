import { listAssets } from '../../database/repositories/assetRepository.js';

class AssetController {
  static async index(req, res) {
    const assets = await listAssets();
    return res.json({ assets });
  }
}

export default AssetController;
