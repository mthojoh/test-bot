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
    console.error(`Wrong handler for intent called, current intent is ${intent}`);
    return response;
  }

  // Get session attributes and slots
  const sessionAttributes = event.sessionState.sessionAttributes || null;
  const slots = intent.slots || null;

  // Step 1 & 2: Check and validate Origin
  if (!slots.Origin || !slots.Origin.value) {
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

  const origin = slots.Origin.value?.interpretedValue || "";
  // Validate origin if needed - this could call an external validation service
  // For demonstration, we'll assume any non-empty origin is valid

  // Step 3 & 4: Check and validate TravelDate
  if (!slots.TravelDate || !slots.TravelDate.value) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "TravelDate",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `When would you like to travel from ${origin}?`
        }
      ],
      sessionAttributes
    );
  }

  const travelDate = slots.TravelDate.value?.interpretedValue || "";
  // Validate travel date
  const isValidDate = CommonUtils.validateDate(travelDate);
  if (!isValidDate) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "TravelDate",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "Please provide a valid date for your travel."
        }
      ],
      sessionAttributes
    );
  }

  // Step 5 & 6: Check and validate Destination
  if (!slots.Destination || !slots.Destination.value) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "Destination",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `Where would you like to travel to from ${origin} on ${travelDate}?`
        }
      ],
      sessionAttributes
    );
  }

  const destination = slots.Destination.value?.interpretedValue || "";
  // Validate destination
  // For demonstration, we'll check that origin and destination are different
  if (origin.toLowerCase() === destination.toLowerCase()) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "Destination",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "Your destination cannot be the same as your origin. Please choose a different destination."
        }
      ],
      sessionAttributes
    );
  }

  // Step 7 & 8: Confirm booking details and process if confirmed
  if (!intent.confirmationState || intent.confirmationState === "None") {
    return DialogHelpers.confirmIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `I'll book a trip from ${origin} to ${destination} on ${travelDate}. Is that correct?`
        }
      ],
      sessionAttributes
    );
  } else if (intent.confirmationState === "Confirmed") {
    // Process the booking
    // In a real implementation, this would call an external service to make the booking
    sessionAttributes.bookingConfirmed = "true";
    sessionAttributes.originCity = origin;
    sessionAttributes.destinationCity = destination;
    sessionAttributes.travelDate = travelDate;
    
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `Great! Your booking from ${origin} to ${destination} on ${travelDate} has been confirmed. Your booking reference is ${CommonUtils.generateBookingReference()}. Is there anything else I can help you with?`
        }
      ],
      sessionAttributes
    );
  } else {
    // User denied confirmation
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I've cancelled your booking request. Is there something else I can help you with?"
        }
      ],
      sessionAttributes
    );
  }
}
