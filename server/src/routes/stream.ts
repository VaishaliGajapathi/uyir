import { Router } from "express";
import jwt from "jsonwebtoken";
import { bus, AlertEvent } from "../services/alerts.js";

export const streamRouter = Router();
const SECRET = process.env.JWT_SECRET || "change-this-secret";

// Server-Sent Events stream for real-time donor alerts.
// Token passed as query param because EventSource cannot set headers.
streamRouter.get("/alerts", (req, res) => {
  const token = req.query.token as string;
  let userId: string;
  try {
    userId = (jwt.verify(token, SECRET) as { userId: string }).userId;
  } catch {
    return res.status(401).end();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: ready\ndata: {"ok":true}\n\n`);

  const channel = `donor:${userId}`;
  const handler = (event: AlertEvent) => {
    res.write(`event: alert\ndata: ${JSON.stringify(event)}\n\n`);
  };
  bus.on(channel, handler);

  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);

  req.on("close", () => {
    clearInterval(ping);
    bus.off(channel, handler);
  });
});

// Per-request live updates (status changes) for requesters watching their request.
streamRouter.get("/request/:id", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: ready\ndata: {"ok":true}\n\n`);

  const channel = `request:${req.params.id}`;
  const handler = (event: any) => res.write(`event: update\ndata: ${JSON.stringify(event)}\n\n`);
  bus.on(channel, handler);
  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);
  req.on("close", () => {
    clearInterval(ping);
    bus.off(channel, handler);
  });
});
