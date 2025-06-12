import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

/**
 * MainDialog - Acts as the central hub for managing different dialogs and routing the conversation appropriately.
 */
export function handler(event: LexCodeHookInputEvent) {
  console.log("MainDialog handler invoked", JSON.stringify(event));
  
  let response = DialogHelpers.passThrough(event);
  const intent = event.sessionState.intent;
  
  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.MAIN_DIALOG) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`);
    return response;
  }
  
  const sessionAttributes = event.sessionState.sessionAttributes || null;
  const inputTranscript = event.inputTranscript?.toLowerCase() || "";
  
  try {
    // Step 1: Determine the current state of the conversation
    const currentState = sessionAttributes.currentState || "initial";
    console.log(`Current conversation state: ${currentState}`);
    
    // Step 2: Route to BookingDialog if they wish to make a booking
    if (inputTranscript.includes("book") || 
        inputTranscript.includes("reservation") || 
        inputTranscript.includes("schedule")) {
      
      console.log("Routing to BookingDialog");
      sessionAttributes.previousState = currentState;
      sessionAttributes.currentState = "booking";
      
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'll help you make a booking. What would you like to book?"
        }],
        sessionAttributes
      );
    }
    
    // Step 3: Route to LuisHelper if they need assistance
    if (inputTranscript.includes("help") || 
        inputTranscript.includes("assist") || 
        inputTranscript.includes("support")) {
      
      console.log("Routing to LuisHelper");
      sessionAttributes.previousState = currentState;
      sessionAttributes.currentState = "assistance";
      
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm here to help. What do you need assistance with?"
        }],
        sessionAttributes
      );
    }
    
    // Handle edge case: ambiguous input
    if (currentState === "initial") {
      console.log("Processing ambiguous input in initial state");
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm not sure what you need. Would you like to make a booking or get some assistance?"
        }],
        sessionAttributes
      );
    }
    
    // Handle edge case: switching between dialogs
    if (
      (currentState === "booking" && (inputTranscript.includes("help") || inputTranscript.includes("support"))) ||
      (currentState === "assistance" && (inputTranscript.includes("book") || inputTranscript.includes("reservation")))
    ) {
      console.log("User is switching between dialogs");
      const newState = currentState === "booking" ? "assistance" : "booking";
      sessionAttributes.previousState = currentState;
      sessionAttributes.currentState = newState;
      
      const message = newState === "booking" ? 
        "I see you want to make a booking now. What would you like to book?" :
        "I see you need help now. What can I assist you with?";
      
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: message
        }],
        sessionAttributes
      );
    }
    
    // Default response if no specific routing is triggered
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "How can I help you today? You can make a booking or ask for assistance."
      }],
      sessionAttributes
    );
  } catch (error) {
    console.error("Error in MainDialog handler:", error);
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "I'm having trouble processing your request. Please try again."
      }],
      sessionAttributes
    );
  }
}
