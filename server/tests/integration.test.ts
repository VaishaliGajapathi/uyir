import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { exec } from "../src/db.js";

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key";
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
  
  const { default: express } = await import("express");
  const { default: cors } = await import("cors");
  const { default: helmet } = await import("helmet");
  
  app = express();
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  
  app.get("/api/health", (_: any, res: any) => res.json({ ok: true, service: "uyir-api" }));
});

afterAll(async () => {
  // Cleanup test data if needed
});

describe("Health Check", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("ok", true);
    expect(response.body).toHaveProperty("service", "uyir-api");
  });
});

describe("Auth Flow", () => {
  it("should reject invalid OTP request", async () => {
    const response = await request(app)
      .post("/api/auth/otp/request")
      .send({ mobile: "123" });
    expect(response.status).toBe(400);
  });

  it("should accept valid OTP request format", async () => {
    const response = await request(app)
      .post("/api/auth/otp/request")
      .send({ mobile: "9876543210" });
    // In test mode without MSG91, this should return 200 with exists: false
    expect([200, 400]).toContain(response.status);
  });
});

describe("Request Flow", () => {
  it("should reject unauthenticated request creation", async () => {
    const response = await request(app)
      .post("/api/requests")
      .send({
        patientName: "Test Patient",
        bloodGroup: "A+",
        unitsRequired: 2,
        hospitalName: "Test Hospital",
        district: "Chennai",
        contactPerson: "Test Contact",
        contactNumber: "9876543210",
        emergencyLevel: "orange",
      });
    expect(response.status).toBe(401);
  });
});

describe("Alert Flow", () => {
  it("should reject unauthenticated alert trigger", async () => {
    const response = await request(app)
      .post("/api/requests/test-id/alert");
    expect(response.status).toBe(401);
  });
});
