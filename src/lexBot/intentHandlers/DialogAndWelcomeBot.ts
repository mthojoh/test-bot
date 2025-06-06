import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";
import { IntentNames } from "../types/constants";

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("../utils/sharedLibraries/CommonUtils");

/**
 * Handler for the DialogAndWelcomeBot intent.
 * Welcomes the user and initiates the main dialog.
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
    const sessionAttributes = event.sessionState.sessionAttributes || null;
    
    // Step 1: Greet the user and provide an overview of what the bot can do
    const welcomeMessage = "Welcome! I'm here to help you with your inquiries. You can ask me about services, information, or assistance with various topics.";
    
    // Step 2: Transition to the MainDialog intent to start the conversation
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: welcomeMessage
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
          content: "I'm sorry, I encountered an issue processing your request. How can I help you today?"
        }
      ],
      event.sessionState.sessionAttributes || null
    );
  }
}
