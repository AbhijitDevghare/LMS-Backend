import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDb } from "./database/db.js";

const PORT = process.env.PORT || 5000;

connectDb();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});