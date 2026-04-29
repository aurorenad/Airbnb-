const AIRBNB_BRAND_COLOR = "#FF5A5F";

export const welcomeEmail = (name: string, role: string): string => {
  const encouragement =
    role === "HOST"
      ? "We're excited to have you! Start by creating your first listing to reach guests from around the world."
      : "We're excited to have you! Start exploring unique listings and book your next stay.";

  const buttonText = role === "HOST" ? "Create a Listing" : "Explore Listings";

  return `
    <div style="font-family: sans-serif; color: #484848; max-width: 600px; margin: auto;">
      <h1 style="color: ${AIRBNB_BRAND_COLOR};">Welcome to Airbnb, ${name}!</h1>
      <p>${encouragement}</p>
      <div style="margin: 30px 0;">
        <a href="#" style="background-color: ${AIRBNB_BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">${buttonText}</a>
      </div>
      <p>Happy travels!</p>
    </div>
  `;
};

export const bookingConfirmationEmail = (
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string => {
  return `
    <div style="font-family: sans-serif; color: #484848; max-width: 600px; margin: auto;">
      <h1 style="color: ${AIRBNB_BRAND_COLOR};">Booking Confirmed!</h1>
      <p>Hi ${guestName}, your booking for <strong>${listingTitle}</strong> is confirmed.</p>
      <div style="background-color: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
      </div>
      <p style="font-size: 14px; color: #767676;">Note: Please check the listing's cancellation policy for details on refunds.</p>
    </div>
  `;
};

export const bookingCancellationEmail = (
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string => {
  return `
    <div style="font-family: sans-serif; color: #484848; max-width: 600px; margin: auto;">
      <h1 style="color: ${AIRBNB_BRAND_COLOR};">Booking Cancelled</h1>
      <p>Hi ${guestName}, your booking for <strong>${listingTitle}</strong> (${checkIn} to ${checkOut}) has been cancelled.</p>
      <p>We're sorry to see you go! Feel free to explore other listings for your next trip.</p>
      <div style="margin: 30px 0;">
        <a href="#" style="background-color: ${AIRBNB_BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Find another stay</a>
      </div>
    </div>
  `;
};

export const passwordResetEmail = (name: string, resetLink: string): string => {
  return `
    <div style="font-family: sans-serif; color: #484848; max-width: 600px; margin: auto;">
      <h1 style="color: ${AIRBNB_BRAND_COLOR};">Reset your password</h1>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <div style="margin: 30px 0;">
        <a href="${resetLink}" style="background-color: ${AIRBNB_BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #767676;">This link will expire in 1 hour.</p>
      <p style="font-size: 14px; color: #767676;">If you did not request this, ignore this email.</p>
    </div>
  `;
};
