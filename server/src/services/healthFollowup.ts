import { prisma } from "../db.js";
import { completeJSON } from "../lib/ai.js";

interface HealthReminder {
  hoursAfterDonation: number;
  message: string;
  fluidType: string;
  foodRecommendation: string;
  sleepRecommendation: string;
}

// AI-generated health reminders based on donor profile
export async function generateHealthReminders(donorId: string, donationDate: Date): Promise<HealthReminder[]> {
  const donor = await prisma.user.findUnique({
    where: { id: donorId },
    select: {
      name: true,
      age: true,
      gender: true,
      bloodGroup: true,
      hemoglobinLevel: true,
      drinkingHabits: true,
      smokingHabits: true,
      sleepHours: true,
      language: true,
    },
  });

  if (!donor) return [];

  const language = donor.language === "ta" ? "Tamil" : "English";
  const prompt = `Generate personalized post-donation health reminders for a blood donor.

Donor Profile:
- Name: ${donor.name}
- Age: ${donor.age || "Not specified"}
- Gender: ${donor.gender || "Not specified"}
- Blood Group: ${donor.bloodGroup || "Not specified"}
- Hemoglobin Level: ${donor.hemoglobinLevel || "Not specified"}
- Drinking Habits: ${donor.drinkingHabits || "Not specified"}
- Smoking Habits: ${donor.smokingHabits || "Not specified"}
- Sleep Hours: ${donor.sleepHours || "Not specified"}

Generate 5 health reminders at different time intervals after donation (immediate, 6 hours, 12 hours, 24 hours, 48 hours, 72 hours).
For each reminder, provide:
1. hoursAfterDonation: number (0, 6, 12, 24, 48, 72)
2. message: short encouraging message in ${language}
3. fluidType: specific fluid recommendation (water, fruit juice, coconut water, electrolyte drink)
4. foodRecommendation: specific food recommendation (iron-rich foods, protein, etc.)
5. sleepRecommendation: sleep advice

Return as JSON array.`;

  try {
    const result = await completeJSON(prompt);
    return result.reminders || [];
  } catch (e) {
    console.error("[healthFollowup] AI generation failed:", e);
    // Fallback to default reminders
    return getDefaultReminders(donor.language);
  }
}

function getDefaultReminders(language: string): HealthReminder[] {
  const isTamil = language === "ta";
  return [
    {
      hoursAfterDonation: 0,
      message: isTamil ? "இரத்த தானம் செய்ததற்கு நன்றி! உடனடியாக நீர் அருந்தவும்." : "Thank you for donating blood! Drink water immediately.",
      fluidType: "Water",
      foodRecommendation: isTamil ? "பழச்சாறு" : "Fruit juice",
      sleepRecommendation: isTamil ? "இன்று நல்ல உறக்கம் எடுக்கவும்" : "Get good rest today",
    },
    {
      hoursAfterDonation: 6,
      message: isTamil ? "நீர் அருந்துவதை தொடரவும்" : "Continue drinking water",
      fluidType: "Coconut water",
      foodRecommendation: isTamil ? "இரும்பு சத்து உணவு" : "Iron-rich food",
      sleepRecommendation: isTamil ? "சிறிது ஓய்வு எடுக்கவும்" : "Take a short rest",
    },
    {
      hoursAfterDonation: 12,
      message: isTamil ? "நலம் பெறுங்கள்" : "Stay healthy",
      fluidType: "Electrolyte drink",
      foodRecommendation: isTamil ? "புரதம் நிறைந்த உணவு" : "Protein-rich food",
      sleepRecommendation: isTamil ? "இரவு 8 மணி நேரம் உறங்கவும்" : "Sleep 8 hours tonight",
    },
    {
      hoursAfterDonation: 24,
      message: isTamil ? "நீங்கள் ஒரு வீரர்" : "You are a hero",
      fluidType: "Fresh fruit juice",
      foodRecommendation: isTamil ? "பச்சைக் காய்கறிகள்" : "Green vegetables",
      sleepRecommendation: isTamil ? "சீரான உறக்கம்" : "Regular sleep",
    },
    {
      hoursAfterDonation: 48,
      message: isTamil ? "உங்கள் உடல் மீண்டும்" : "Your body is recovering",
      fluidType: "Water",
      foodRecommendation: isTamil ? "சமச்சரவு உணவு" : "Balanced diet",
      sleepRecommendation: isTamil ? "நல்ல உறக்கம்" : "Good sleep",
    },
    {
      hoursAfterDonation: 72,
      message: isTamil ? "மீண்டும் வருங்கள்" : "Come back again",
      fluidType: "Water",
      foodRecommendation: isTamil ? "ஆரோக்கியமான உணவு" : "Healthy food",
      sleepRecommendation: isTamil ? "இயல்பு உறக்கம்" : "Normal sleep",
    },
  ];
}

// Schedule health reminders for a donor after donation
export async function scheduleHealthReminders(donorId: string, donationDate: Date) {
  const reminders = await generateHealthReminders(donorId, donationDate);
  
  for (const reminder of reminders) {
    const reminderTime = new Date(donationDate.getTime() + reminder.hoursAfterDonation * 60 * 60 * 1000);
    
    // Store reminder in database
    await prisma.healthReminder.create({
      data: {
        donorId,
        donationDate,
        hoursAfterDonation: reminder.hoursAfterDonation,
        message: reminder.message,
        fluidType: reminder.fluidType,
        foodRecommendation: reminder.foodRecommendation,
        sleepRecommendation: reminder.sleepRecommendation,
        scheduledAt: reminderTime,
      },
    });
    
    console.log(`[healthFollowup] Scheduled reminder for donor ${donorId} at ${reminderTime}`);
  }
  
  return reminders;
}

// Send health reminder via SMS
export async function sendHealthReminder(donorId: string, reminder: HealthReminder) {
  const donor = await prisma.user.findUnique({
    where: { id: donorId },
    select: { mobile: true, name: true, language: true },
  });

  if (!donor) return;

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      // @ts-ignore
      const twilio = require("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const message = `🩸 UYIR Health Reminder\n\n${reminder.message}\n\n💧 Drink: ${reminder.fluidType}\n🍎 Eat: ${reminder.foodRecommendation}\n😴 Sleep: ${reminder.sleepRecommendation}\n\n- UYIR Team`;
      
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${donor.mobile}`,
      });
      
      console.log(`[healthFollowup] SMS sent to donor ${donor.mobile}`);
    } catch (e: any) {
      console.error(`[healthFollowup] SMS failed: ${e.message}`);
    }
  }
}

// Check and send due health reminders (called by cron job)
export async function processDueReminders() {
  const now = new Date();
  
  const dueReminders = await prisma.healthReminder.findMany({
    where: {
      scheduledAt: { lte: now },
      sent: false
    },
    include: { donor: true }
  });
  
  console.log(`[healthFollowup] Processing ${dueReminders.length} due reminders at ${now}`);
  
  for (const reminder of dueReminders) {
    try {
      await sendHealthReminder(reminder.donorId, {
        hoursAfterDonation: reminder.hoursAfterDonation,
        message: reminder.message,
        fluidType: reminder.fluidType,
        foodRecommendation: reminder.foodRecommendation,
        sleepRecommendation: reminder.sleepRecommendation,
      });
      
      await prisma.healthReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: now }
      });
      
      console.log(`[healthFollowup] Sent reminder ${reminder.id} to donor ${reminder.donorId}`);
    } catch (e: any) {
      console.error(`[healthFollowup] Failed to send reminder ${reminder.id}:`, e.message);
    }
  }
  
  return { processed: dueReminders.length };
}
