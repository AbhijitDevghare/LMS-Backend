import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";

import { connectDb } from "./database/db.js";

const PORT =
    process.env.PORT || 5000;

await connectDb();

const server = app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);

// 10 MINUTES TIMEOUT
server.timeout =
    10 * 60 * 1000;

export default app;