module.exports = (sequelize, DataTypes) => {
  const ScheduledJobRun = sequelize.define('ScheduledJobRun', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    job_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'scheduled_job_runs',
    timestamps: false,
  });

  return ScheduledJobRun;
};
