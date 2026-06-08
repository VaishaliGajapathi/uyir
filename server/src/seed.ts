import { prisma } from "./db.js";
import { TN_DISTRICTS } from "./lib/districts.js";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const NAMES = [
  "Arun", "Vijay", "Suresh", "Karthik", "Ramesh", "Priya", "Divya", "Saravanan",
  "Lakshmi", "Muthu", "Anand", "Kavya", "Bala", "Senthil", "Deepa", "Gopal",
  "Hari", "Nithya", "Praveen", "Sangeetha", "Vimal", "Janani", "Mohan", "Revathi",
];
const CORE_DISTRICTS = ["Coimbatore", "Salem", "Erode", "Tiruppur", "Chennai", "Madurai", "Trichy", "Namakkal"];

function jitter(base: number, km = 8) {
  return base + (Math.random() - 0.5) * (km / 111);
}

async function main() {
  console.log("[seed] clearing...");
  await prisma.alertLog.deleteMany();
  await prisma.donorResponse.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.donorBadge.deleteMany();
  await prisma.fraudReport.deleteMany();
  await prisma.bloodRequest.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  // Hospitals
  const hospitals = [
    { name: "Coimbatore Medical College Hospital", district: "Coimbatore", phone: "0422-2301393" },
    { name: "KMCH Coimbatore", district: "Coimbatore", phone: "0422-4323800" },
    { name: "Salem Government Hospital", district: "Salem", phone: "0427-2383901" },
    { name: "Erode Government Hospital", district: "Erode", phone: "0424-2266667" },
    { name: "Rajaji Hospital Madurai", district: "Madurai", phone: "0452-2532535" },
    { name: "Rajiv Gandhi GGH Chennai", district: "Chennai", phone: "044-25305000" },
  ];
  for (const h of hospitals) {
    const c = TN_DISTRICTS[h.district];
    await prisma.hospital.create({ data: { ...h, lat: c?.lat, lng: c?.lng, verified: true } });
  }

  // Donors spread across core districts
  let n = 0;
  for (const district of CORE_DISTRICTS) {
    const c = TN_DISTRICTS[district];
    for (let i = 0; i < 12; i++) {
      const name = NAMES[(n + i) % NAMES.length];
      const group = GROUPS[(n + i) % GROUPS.length];
      const donated = Math.floor(Math.random() * 15);
      await prisma.user.create({
        data: {
          name: `${name} ${district.slice(0, 3)}`,
          mobile: `9${String(100000000 + n * 9999 + i * 137).slice(0, 9)}`,
          role: "donor",
          language: "ta",
          district,
          bloodGroup: group,
          isPlateletDonor: i % 3 === 0,
          shareLocation: true,
          lat: c ? jitter(c.lat) : null,
          lng: c ? jitter(c.lng) : null,
          lastDonationDate: new Date(Date.now() - (95 + Math.random() * 200) * 86400000),
          donationCount: donated,
          reputationScore: donated * 50,
          verified: true,
        },
      });
    }
    n += 12;
  }

  // A demo requester + verifier
  const requester = await prisma.user.create({
    data: { name: "Demo Requester", mobile: "9000000001", role: "requester", district: "Coimbatore", language: "ta" },
  });
  await prisma.user.create({
    data: { name: "NGO Verifier", mobile: "9000000002", role: "verifier", district: "Coimbatore", language: "en" },
  });

  // Super admin (from environment variable or default)
  const superAdminMobile = process.env.SUPER_ADMIN_MOBILE || "9000000000";
  const bcrypt = (await import("bcryptjs")).default;
  const superAdminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Super Admin",
      mobile: superAdminMobile.replace(/\D/g, "").slice(-10),
      role: "admin",
      password: superAdminPassword,
      verified: true,
    },
  });
  console.log(`[seed] Super admin created with mobile: ${superAdminMobile}, password: admin123`);

  // A sample verified request to populate feeds
  const c = TN_DISTRICTS["Coimbatore"];
  await prisma.bloodRequest.create({
    data: {
      patientName: "Ramesh Kumar",
      bloodGroup: "O+",
      componentType: "platelets",
      unitsRequired: 2,
      hospitalName: "KMCH Coimbatore",
      district: "Coimbatore",
      contactPerson: "Suresh",
      contactNumber: "9000000001",
      emergencyLevel: "red",
      status: "verified",
      verificationScore: 92,
      verificationNotes: "Seed sample — verified.",
      lat: c.lat,
      lng: c.lng,
      createdById: requester.id,
    },
  });

  const total = await prisma.user.count();
  console.log(`[seed] done. users=${total}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
