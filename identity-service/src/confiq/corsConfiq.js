import cors from "cors";

const configureCors = () => {
    return cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                "http://localhost:3000", //local dev
            ];

            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true); //giving permission so that req can be allowed
            } else {
                callback(new Error("Not allowed by cors"));
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept-Version"],
        exposedHeaders: ["X-Total-Count", "Content-Range"],
        credentials: true,
        preflightContinue: false,
        maxAge: 600,
        optionsSuccessStatus: 204,
    });
};

export default configureCors;