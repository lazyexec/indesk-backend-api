import fs from "fs";
import path from "path";
import { type Response } from "express";

const DEFAULT_FALLBACK_TEXT = "Indesk Backend API";

const sendRootDocs = (res: Response, currentDir: string): void => {
  const distDocsPath = path.join(currentDir, "./docs/index.html");
  const srcDocsPath = path.join(process.cwd(), "src/docs/index.html");

  if (fs.existsSync(distDocsPath)) {
    res.sendFile(distDocsPath);
    return;
  }

  if (fs.existsSync(srcDocsPath)) {
    res.sendFile(srcDocsPath);
    return;
  }

  res.status(200).send(DEFAULT_FALLBACK_TEXT);
};

export default sendRootDocs;
