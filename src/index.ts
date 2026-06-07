import express, { Request, Response } from "express";

const app = express();

app.use(express.static("public"));

app.get("/api/message", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"))
