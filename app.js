import express from "express";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "./.env" });

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join("public")));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

const port = process.env.PORT;

app.listen(3000, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
