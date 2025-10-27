/* eslint-disable no-nested-ternary */
import { Model, DataTypes } from 'sequelize';

function formatDateTimeBr(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveResult(pnl) {
  if (!Number.isFinite(pnl)) {
    return null;
  }
  if (pnl > 0) {
    return 'profit';
  }
  if (pnl < 0) {
    return 'loss';
  }
  return null;
}

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
        candleCrossTimeBr: {
          type: DataTypes.VIRTUAL,
          get() {
            return formatDateTimeBr(this.getDataValue('candleCrossTime'));
          },
        },
        exitTimeBr: {
          type: DataTypes.VIRTUAL,
          get() {
            return formatDateTimeBr(this.getDataValue('exitTime'));
          },
        },
        createdAtBr: {
          type: DataTypes.VIRTUAL,
          get() {
            return formatDateTimeBr(this.getDataValue('createdAt'));
          },
        },
        updatedAtBr: {
          type: DataTypes.VIRTUAL,
          get() {
            return formatDateTimeBr(this.getDataValue('updatedAt'));
          },
        },
        result: {
          type: DataTypes.VIRTUAL,
          get() {
            const pnl = toNumber(this.getDataValue('pnl'));
            return resolveResult(pnl);
          },
        },
        slippage: {
          type: DataTypes.VIRTUAL,
          get() {
            const pnl = toNumber(this.getDataValue('pnl'));
            const exitPrice = toNumber(this.getDataValue('exitPrice'));
            const tpPrice = toNumber(this.getDataValue('tpPrice'));
            const slPrice = toNumber(this.getDataValue('slPrice'));

            const resultType = resolveResult(pnl);
            const expectedPrice =
              resultType === 'profit'
                ? tpPrice
                : resultType === 'loss'
                  ? slPrice
                  : null;

            if (
              !Number.isFinite(exitPrice) ||
              !Number.isFinite(expectedPrice)
            ) {
              return null;
            }

            const diff = exitPrice - expectedPrice;
            return Number(diff.toFixed(8));
          },
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
