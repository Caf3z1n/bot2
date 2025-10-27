import { Model, DataTypes } from 'sequelize';

export default class Position extends Model {
  static Status = {
    OPEN: 'open',
    CLOSED: 'closed',
  };

  static Side = {
    LONG: 'long',
    SHORT: 'short',
  };

  static initialize(sequelize) {
    super.init(
      {
        symbol: {
          type: DataTypes.STRING(16),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        side: {
          type: DataTypes.ENUM(...Object.values(Position.Side)),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(Position.Status)),
          allowNull: false,
          defaultValue: Position.Status.OPEN,
        },
        orderId: {
          field: 'order_id',
          type: DataTypes.STRING(64),
        },
        tpOrderId: {
          field: 'tp_order_id',
          type: DataTypes.STRING(64),
        },
        slOrderId: {
          field: 'sl_order_id',
          type: DataTypes.STRING(64),
        },
        candleCrossTime: {
          field: 'candle_cross_time',
          type: DataTypes.DATE,
        },
        fees: {
          type: DataTypes.DECIMAL(20, 8),
        },
        price: {
          type: DataTypes.DECIMAL(20, 8),
        },
        tpPrice: {
          field: 'tp_price',
          type: DataTypes.DECIMAL(20, 8),
        },
        slPrice: {
          field: 'sl_price',
          type: DataTypes.DECIMAL(20, 8),
        },
        exitPrice: {
          field: 'exit_price',
          type: DataTypes.DECIMAL(20, 8),
        },
        notional: {
          type: DataTypes.DECIMAL(20, 8),
        },
        qty: {
          type: DataTypes.DECIMAL(20, 8),
        },
        exitTime: {
          field: 'exit_time',
          type: DataTypes.DATE,
        },
        pnl: {
          type: DataTypes.DECIMAL(20, 8),
        },
      },
      {
        sequelize,
        tableName: 'positions',
        modelName: 'Position',
        underscored: true,
        timestamps: true,
        defaultScope: {
          order: [['id', 'DESC']],
        },
      }
    );

    return Position;
  }
}
