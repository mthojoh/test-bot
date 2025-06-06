import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

/**
 * Handler for the DialogAndWelcomeBot intent.
 * This intent handles the welcome message and initial interaction with the user.
 * 
 * @param event - The Lex event containing session state and request information
 * @returns The response to be sent back to Lex
 */
export function handler(event: LexCodeHookInputEvent) {
  let response = DialogHelpers.passThrough(event);
  const intent = event.sessionState.intent;

  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.DIALOG_AND_WELCOME_BOT) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`);
    return response;
  }

  try {
    // Get or initialize session attributes
    const sessionAttributes = event.sessionState.sessionAttributes || null;
    
    // Create welcome message with options
    const welcomeMessage = "Welcome to our service! I can help you book an appointment or provide information. What would you like to do today?";
    const options = "You can say 'start booking' to begin the booking process, or 'help' if you need assistance.";
    
    // Store in session that we've welcomed the user
    sessionAttributes.hasWelcomed = "true";
    
    // Check for edge cases
    if (event.inputTranscript && event.inputTranscript.toLowerCase().includes("help")) {
      // User asked for help immediately
      return DialogHelpers.elicitIntent(
        event.sessionState,
        event.requestAttributes || null,
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "I'm here to help! You can book an appointment or ask questions about our services. What would you like to know?"
          }
        ],
        sessionAttributes
      );
    }
    
    // Return welcome message and options
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: welcomeMessage
        },
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: options
        }
      ],
      sessionAttributes
    );
  } catch (error) {
    console.error("Error in DialogAndWelcomeBot handler:", error);
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm sorry, I encountered an error. Please try again later."
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}