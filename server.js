import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";

import { connectDb } from "./database/db.js";

const PORT =
    process.env.PORT || 5000;

const startServer = async () => {

    try {

        await connectDb();

        const server = app.listen(
            PORT,
            () => {

                console.log(
                    `Server running on port ${PORT}`
                );

            }
        );

        server.timeout =
            10 * 60 * 1000;

    } catch (error) {

        console.log(error);

    }

};

startServer();

export default app;