import "dotenv/config";
import { sendEmail } from "../src/config/email.js";

async function test() {
  try {
    console.log("Testing email connection...");
    await sendEmail("aurorenadine25@gmail.com", "Test Email", "<h1>It works!</h1>");
    console.log("Test completed.");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
