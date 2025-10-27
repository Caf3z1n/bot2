import { Router } from 'express';
import appConfig from './config/app.js';

import CandleController from './app/controllers/CandleController.js';
import AssetController from './app/controllers/AssetController.js';
import InfoController from './app/controllers/InfoController.js';
import BinanceOrderController from './app/controllers/BinanceOrderController.js';
import PositionController from './app/controllers/PositionController.js';

const routes = Router();

if (appConfig.enableDebugRoutes) {
  routes.get('/debug/candles', CandleController.index);

  routes.get('/debug/assets', AssetController.index);
  routes.put('/debug/assets/update', AssetController.update);

  routes.get('/debug/info', InfoController.index);
  routes.delete(
    '/debug/binance/open-orders',
    BinanceOrderController.cancelOpen
  );
  routes.get('/debug/binance/order/:orderId?', BinanceOrderController.show);
  routes.get('/debug/positions/:orderId?/fees', PositionController.fees);
  routes.get('/debug/positions/order/:orderId?', PositionController.order);
}

export default routes;
