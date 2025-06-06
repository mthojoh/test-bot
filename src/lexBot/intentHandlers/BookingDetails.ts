import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

export function handler(event: LexCodeHookInputEvent) {
  let response = DialogHelpers.passThrough(event);
  const intent = event.sessionState.intent;

  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.BOOKING_DETAILS) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`);
    return response;
  }

  try {
    const sessionAttributes = event.sessionState.sessionAttributes || null;
    const slots = intent.slots || null;
    const bookingId = slots.BookingID?.value?.interpretedValue;

    // Step 1: If BookingID is not provided, prompt the user
    if (!bookingId) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "BookingID",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Please provide your booking ID so I can retrieve your booking details."
          }
        ],
        sessionAttributes
      );
    }

    // Step 2: Validate the booking ID and retrieve booking details
    // This is where you would typically call an API or database
    // For this example, we'll simulate validation
    if (!isValidBookingId(bookingId)) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "BookingID",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Sorry, that doesn't appear to be a valid booking ID. Please check and try again."
          }
        ],
        sessionAttributes
      );
    }

    // Step 3: Present booking details to the user
    const bookingDetails = retrieveBookingDetails(bookingId);
    if (!bookingDetails) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "BookingID",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "I couldn't find a booking with that ID. Please verify your booking ID and try again."
          }
        ],
        sessionAttributes
      );
    }

    // Store booking details in session attributes for future use
    sessionAttributes.bookingDetails = JSON.stringify(bookingDetails);

    // Step 4: Offer additional actions based on booking details
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `Here are your booking details for ID ${bookingId}:\n\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\nLocation: ${bookingDetails.location}\n\nWould you like to modify this booking, cancel it, or get directions to the location?`
        }
      ],
      sessionAttributes
    );
  } catch (error) {
    console.error("Error processing BookingDetails intent:", error);
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm sorry, I encountered an error while retrieving your booking details. Please try again later."
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}

// Mock function to validate booking ID format
function isValidBookingId(bookingId: string): boolean {
  // In a real implementation, this would validate against a specific format
  // For this example, we'll check if it's alphanumeric and of certain length
  const pattern = /^[A-Z0-9]{8,12}$/;
  return pattern.test(bookingId);
}

// Mock function to retrieve booking details
function retrieveBookingDetails(bookingId: string): any {
  // In a real implementation, this would call an API or database
  // For this example, we'll return mock data
  if (bookingId === "BOOK123456") {
    return {
      id: bookingId,
      date: "2023-12-15",
      time: "14:30",
      location: "123 Main Street, Suite 400",
      status: "Confirmed"
    };
  }
  return null;
}
