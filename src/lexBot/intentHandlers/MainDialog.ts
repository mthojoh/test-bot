import * as jmespath from "jmespath";
import {
  LexCodeHookInputEvent,
  passThrough
} from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

// Import dialog handlers
import * as BookingDialog from "./intentHandlers/BookingDialog";
import * as BookingDetails from "./intentHandlers/BookingDetails";
// Import other dialog handlers as needed

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

require("dotenv").config();

export async function handler(
  event: LexCodeHookInputEvent
): Promise<Record<string, any>> {
  console.log("Incoming event:", JSON.stringify(event));

  try {
    const { intentName } = jmespath.search(
      event,
      "{intentName: sessionState.intent.name}"
    ) as {
      intentName: string;
    };

    console.log("Detected intent:", intentName);

    if (!intentName) {
      console.error("No intent found in request:", { event });
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm not sure what you'd like to do. Could you please be more specific?"
        }],
        event.sessionState.sessionAttributes || null
      );
    }

    // Check for cancel or change requests across any dialog
    if (containsCancelOrChangeKeywords(event)) {
      return handleCancelOrChangeRequest(event);
    }

    // Route to appropriate dialog handler based on intent
    switch (intentName) {
      case IntentNames.BOOKING_DIALOG:
        return await BookingDialog.handler(event);
      
      case IntentNames.BOOKING_DETAILS:
        return await BookingDetails.handler(event);
      
      // Add cases for other intents/dialogs
      
      default:
        console.log(`No specific handler for intent: ${intentName}, using passthrough`);
        return passThrough(event);
    }
  } catch (error) {
    console.error("Error in MainDialog handler:", error);
    
    // Return a friendly error message
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "I'm sorry, I encountered an error processing your request. Please try again."
      }],
      event.sessionState.sessionAttributes || null
    );
  }
}

/**
 * Helper function to check if user input contains cancel or change keywords
 */
function containsCancelOrChangeKeywords(event: LexCodeHookInputEvent): boolean {
  const userInput = event.inputTranscript?.toLowerCase() || "";
  const cancelKeywords = ["cancel", "stop", "quit", "exit", "change", "modify", "different"];
  
  return cancelKeywords.some(keyword => userInput.includes(keyword));
}

/**
 * Handles user requests to cancel or change the current action
 */
function handleCancelOrChangeRequest(event: LexCodeHookInputEvent) {
  const sessionAttributes = event.sessionState.sessionAttributes || null;
  const currentDialog = sessionAttributes.currentDialog;
  
  if (!currentDialog) {
    // No active dialog to cancel
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "There's nothing active to cancel. How can I help you?"
      }],
      sessionAttributes
    );
  }
  
  // Clear dialog-specific attributes
  delete sessionAttributes.currentDialog;
  // Clear other dialog-specific attributes as needed
  
  return DialogHelpers.elicitIntent(
    event.sessionState,
    event.requestAttributes || null,
    [{
      contentType: MessageContentType.PLAIN_TEXT,
      content: "I've cancelled your current action. Is there something else I can help with?"
    }],
    sessionAttributes
  );
}