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
    
    // Check if all required slots are filled
    const origin = slots.Origin?.value?.interpretedValue;
    const travelDate = slots.TravelDate?.value?.interpretedValue;
    const destination = slots.Destination?.value?.interpretedValue;
    
    // Step 1 & 2: Acknowledge request and collect/confirm required slots
    if (!origin) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Origin",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "From which city will you be departing?"
          }
        ],
        sessionAttributes
      );
    }
    
    if (!travelDate) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "On what date would you like to travel?"
          }
        ],
        sessionAttributes
      );
    }
    
    if (!destination) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "Destination",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "What is your destination city?"
          }
        ],
        sessionAttributes
      );
    }
    
    // Edge case: Check if travel date is in the past
    const currentDate = new Date();
    const parsedTravelDate = new Date(travelDate);
    
    if (parsedTravelDate < currentDate) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "The travel date you provided is in the past. Please provide a future date for your travel."
          }
        ],
        sessionAttributes
      );
    }
    
    // Step 3: Retrieve and provide booking details
    // Note: In a real implementation, this would likely call an external service
    const bookingDetails = `Here are your booking details:\n- Departing from: ${origin}\n- Destination: ${destination}\n- Travel date: ${travelDate}`;
    
    // Step 4: Offer additional assistance
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `${bookingDetails}\n\nIs there anything else you would like to know about your booking? You can ask about baggage allowance, meal options, or seat selection.`
        }
      ],
      sessionAttributes
    );
  } catch (error) {
    console.error("Error in BookingDetails handler:", error);
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm sorry, I encountered an issue while processing your booking details. Please try again later."
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}
