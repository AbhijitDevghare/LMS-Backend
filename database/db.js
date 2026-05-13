import mongoose from "mongoose";

mongoose.set("strictQuery", false);

let isConnected = false;

export const connectDb = async () => {
    try {
        if (isConnected) {
            console.log(
                "Using existing database connection"
            );
            return;
        }

        const db = await mongoose.connect(
            process.env.MONGO_URI,
            {
                dbName: "LMS",
            }
        );

        isConnected =
            db.connections[0].readyState;

        console.log(
            "Database connection successful"
        );
    } catch (error) {
        console.error(
            "MongoDB connection error:",
            error
        );
    }
};