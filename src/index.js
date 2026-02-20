require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "COMP3133 Assignment 1 server is running" });
});

const start = async () => {
  try {
    await connectDB();

    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    app.use("/graphql", expressMiddleware(server));

    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

start();
