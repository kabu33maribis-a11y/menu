import { initializeDatabase } from "../src/lib/db/init";

initializeDatabase()
  .then(() => {
    console.log("Database initialized");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
