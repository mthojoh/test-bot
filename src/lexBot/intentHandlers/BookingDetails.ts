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
    
    // Step 1 & 2: Check if BookingID slot is provided and validate it
    const bookingIdSlot = intent.slots?.BookingID;
    
    // If BookingID is not provided, prompt for it
    if (!bookingIdSlot || !bookingIdSlot.value?.interpretedValue) {
      console.log("Booking ID not provided, prompting user");
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "BookingID",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Please provide your booking ID so I can look up the details."
          }
        ],
        sessionAttributes
      );
    }
    
    const bookingId = bookingIdSlot.value.interpretedValue;
    console.log(`Processing booking details request for ID: ${bookingId}`);
    
    // Step 3: Retrieve and validate booking details
    // In a real implementation, this would call a service to retrieve booking details
    const isValidBooking = validateBookingId(bookingId);
    
    if (!isValidBooking) {
      console.log(`Invalid booking ID provided: ${bookingId}`);
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "BookingID",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "I couldn't find a booking with that ID. Please check the ID and try again."
          }
        ],
        sessionAttributes
      );
    }
    
    // Mock retrieval of booking details
    // In production, these details would come from an API call
    const bookingDetails = getBookingDetails(bookingId);
    
    // Step 4: Display booking details and offer options
    const responseMessage = `Here are your booking details:\n\nBooking ID: ${bookingDetails.id}\nOrigin: ${bookingDetails.origin}\nDestination: ${bookingDetails.destination}\nTravel Date: ${bookingDetails.travelDate}\nStatus: ${bookingDetails.status}\n\nWould you like to modify this booking or do you need any other assistance?`;
    
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: responseMessage
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
          content: "I'm sorry, I encountered an error while retrieving your booking details. Please try again later or contact customer support for assistance."
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}

// Mock function to validate booking ID
// In production, this would verify against a database or API
function validateBookingId(bookingId: string): boolean {
  // Simple validation logic - in reality this would check against a database
  return bookingId && bookingId.length >= 6 && /^[A-Z0-9]+$/.test(bookingId);
}

// Mock function to get booking details
// In production, this would call an API or database
function getBookingDetails(bookingId: string): any {
  // Mock data - would be replaced with actual API call
  return {
    id: bookingId,
    origin: "New York (JFK)",
    destination: "London (LHR)",
    travelDate: "2023-12-15",
    status: "Confirmed"
  };
}
