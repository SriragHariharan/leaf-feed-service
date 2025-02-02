/*
 * Table Deletion Script
 * ---------------------
 * This script is used to drop all tables in the database.
 * It is intended for use in DEVELOPMENT environments only,
 * where schema changes are frequent and dropping tables is safe.
 *
 * WARNING:
 * - DO NOT use this script in PRODUCTION environments.
 * - Dropping tables will permanently delete all data in the tables.
 * - Use migrations for schema changes in production.
 */

import { sequelize } from "./models.sequelize";

// Drop all tables in the database
sequelize
  .drop()
  .then(() => console.log("✅✅ All tables dropped! ✅✅"))
  .catch((err) => console.error("Error dropping all tables:", err));
