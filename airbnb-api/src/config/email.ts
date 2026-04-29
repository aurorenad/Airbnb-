import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: (process.env["EMAIL_HOST"] || "").includes("gmail") ? "gmail" : undefined,
  host: (process.env["EMAIL_HOST"] || "").includes("gmail") ? undefined : (process.env["EMAIL_HOST"] || "smtp.gmail.com"),
  port: parseInt(process.env["EMAIL_PORT"] || "587"),
  secure: false,
  auth: {
    user: process.env["EMAIL_USER"],
    pass: process.env["EMAIL_PASS"],
  },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    console.log(`Attempting to send email to: ${to} with subject: ${subject}`);
    const info = await transporter.sendMail({
      from: `"Airbnb Clone" <${process.env["EMAIL_USER"]}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error in sendEmail function:", error);
    throw error;
  }
};
