import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

export function handler(event: LexCodeHookInputEvent) {
  let response = DialogHelpers.passThrough(event);
  const intent = event.sessionState.intent;

  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.BOOKING_DIALOG) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`);
    return response;
  }

  try {
    const sessionAttributes = event.sessionState.sessionAttributes || null;
    const slots = intent.slots || null;

    // Step 1 & 2: Handle Origin slot
    if (!slots.Origin?.value) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Origin",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Where would you like to travel from?"
          }
        ],
        sessionAttributes
      );
    }

    // Validate Origin
    const origin = slots.Origin.value?.interpretedValue;
    if (!validateLocation(origin)) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Origin",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `I'm sorry, but ${origin} doesn't seem to be a valid location. Please provide a valid origin.`
          }
        ],
        sessionAttributes
      );
    }

    // Step 3 & 4: Handle TravelDate slot
    if (!slots.TravelDate?.value) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `Great! You'll be traveling from ${origin}. When would you like to travel?`
          }
        ],
        sessionAttributes
      );
    }

    // Validate TravelDate
    const travelDate = slots.TravelDate.value?.interpretedValue;
    if (!validateDate(travelDate)) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `I'm sorry, but ${travelDate} doesn't seem to be a valid date. Please provide a valid travel date.`
          }
        ],
        sessionAttributes
      );
    }

    // Step 5 & 6: Handle Destination slot
    if (!slots.Destination?.value) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Destination",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `Perfect! You'll be traveling from ${origin} on ${travelDate}. Where would you like to go?`
          }
        ],
        sessionAttributes
      );
    }

    // Validate Destination
    const destination = slots.Destination.value?.interpretedValue;
    if (!validateLocation(destination)) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Destination",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `I'm sorry, but ${destination} doesn't seem to be a valid location. Please provide a valid destination.`
          }
        ],
        sessionAttributes
      );
    }

    // Check if origin and destination are the same
    if (origin.toLowerCase() === destination.toLowerCase()) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Destination",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `The origin and destination cannot be the same. Please choose a different destination.`
          }
        ],
        sessionAttributes
      );
    }

    // Step 7: Summarize and confirm booking
    if (!sessionAttributes.confirmationRequested) {
      sessionAttributes.confirmationRequested = "true";
      
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "ConfirmBooking",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `Great! I have your booking details: You want to travel from ${origin} to ${destination} on ${travelDate}. Is this correct? Please respond with 'yes' or 'no'.`
          }
        ],
        sessionAttributes
      );
    }

    // Step 8: Process the booking if confirmed
    const confirmBooking = slots.ConfirmBooking?.value?.interpretedValue?.toLowerCase();
    
    if (confirmBooking === "yes") {
      // Process the booking
      const bookingId = generateBookingId();
      sessionAttributes.bookingId = bookingId;
      
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: `Your booking has been confirmed! Your booking ID is ${bookingId}. Thank you for choosing our service.`
          }
        ],
        sessionAttributes
      );
    } else if (confirmBooking === "no") {
      // Reset slots for correction
      delete sessionAttributes.confirmationRequested;
      
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "I understand. Let's start the booking process again. What would you like to do?"
          }
        ],
        sessionAttributes
      );
    } else {
      // Handle invalid confirmation response
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "ConfirmBooking",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "I didn't understand your response. Please confirm if your booking details are correct by responding with 'yes' or 'no'."
          }
        ],
        sessionAttributes
      );
    }
  } catch (error) {
    console.error("Error in BookingDialog handler:", error);
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm sorry, but there was an error processing your booking. Please try again later."
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}

// Helper functions
function validateLocation(location: string | undefined): boolean {
  if (!location) return false;
  // This is a simple validation. In a real application, you would check against a database of valid locations.
  return location.length > 0;
}

function validateDate(dateString: string | undefined): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if it's a valid date and it's not in the past
    return !isNaN(date.getTime()) && date >= today;
  } catch (error) {
    return false;
  }
}

function generateBookingId(): string {
  // Generate a simple booking ID based on timestamp and random numbers
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `BK${timestamp}${random}`;
}
