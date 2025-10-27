import { Model, DataTypes } from 'sequelize';

export default class Asset extends Model {
  static Status = {
    AWAITING_CROSS: 'awaiting_cross',
    AWAITING_PULLBACK: 'awaiting_pullback',
    IN_POSITION: 'in_position',
    COOLDOWN: 'cooldown',
  };

  static Side = {
    LONG: 'long',
    SHORT: 'short',
  };

  static SideBias = Asset.Side;

  static initialize(sequelize) {
    super.init(
      {
        symbol: {
          type: DataTypes.STRING(16),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
          },
        },
        status: {
          type: DataTypes.ENUM(...Object.values(Asset.Status)),
          allowNull: false,
          defaultValue: Asset.Status.AWAITING_CROSS,
        },
        side: {
          type: DataTypes.ENUM(...Object.values(Asset.Side)),
          allowNull: true,
        },
        emaFast2: {
          field: 'ema_fast_2',
          type: DataTypes.DECIMAL(20, 8),
        },
        emaFast1: {
          field: 'ema_fast_1',
          type: DataTypes.DECIMAL(20, 8),
        },
        emaSlow2: {
          field: 'ema_slow_2',
          type: DataTypes.DECIMAL(20, 8),
        },
        emaSlow1: {
          field: 'ema_slow_1',
          type: DataTypes.DECIMAL(20, 8),
        },
        unixCurrentCandle: {
          field: 'unix_current_candle',
          type: DataTypes.BIGINT,
        },
        candleCrossTime: {
          field: 'candle_cross_time',
          type: DataTypes.DATE,
        },
        stepSize: {
          field: 'step_size',
          type: DataTypes.DECIMAL(20, 10),
        },
        tickSize: {
          field: 'tick_size',
          type: DataTypes.DECIMAL(20, 10),
        },
        minQty: {
          field: 'min_qty',
          type: DataTypes.DECIMAL(20, 10),
        },
        triggerPrice: {
          field: 'trigger_price',
          type: DataTypes.DECIMAL(20, 8),
        },
        orderId: {
          field: 'order_id',
          type: DataTypes.STRING(64),
        },
        maxNotional: {
          field: 'max_notional',
          type: DataTypes.DECIMAL(20, 8),
        },
        leverage: {
          field: 'leverage',
          type: DataTypes.INTEGER,
        },
      },
      {
        sequelize,
        tableName: 'assets',
        modelName: 'Asset',
        underscored: true,
        timestamps: true,
        defaultScope: {
          order: [['id', 'ASC']],
        },
      }
    );

    return Asset;
  }
}
