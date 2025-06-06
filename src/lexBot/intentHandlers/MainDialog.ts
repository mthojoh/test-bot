import * as jmespath from "jmespath";
import {
  LexRequest,
  passThrough
} from "@optum-digital-ce-rx-bots/uhc-cvx-lex-bot-commons";
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2";

import BookingDialog from "./intentHandlers/BookingDialog";
// Import other intent handlers as needed

const DialogHelpers = require("./utils/sharedLibraries/DialogHelpers");
const CommonUtils = require("./utils/sharedLibraries/CommonUtils");

require("dotenv").config();

/**
 * Main dialog handler that manages the conversation flow and routes to appropriate intents
 * @param event The incoming Lex event
 * @param context The Lambda context
 * @returns The response to be sent back to Lex
 */
export async function handler(
  event: Record<string, any>,
  context: any
): Promise<Record<string, any>> {
  const eventJson = JSON.parse(event.Payload);
  const lexPayload = {
    ...eventJson
  } as LexRequest;

  try {
    console.log("Incoming lexPayload:", JSON.stringify(lexPayload));

    const { intentName } = jmespath.search(
      lexPayload,
      "{intentName: sessionState.intent.name}"
    ) as {
      intentName: string;
    };

    console.log("IntentName:", intentName);
    
    // Get session attributes to maintain conversation state
    const sessionAttributes = lexPayload.sessionState?.sessionAttributes || null;

    if (!intentName) {
      console.error("No intent found in request:", { intentName });
      
      // Handle ambiguous input by providing a clarifying message
      return DialogHelpers.elicitIntent(
        lexPayload.sessionState,
        lexPayload.requestAttributes || null,
        [{
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'm not sure what you're asking for. Could you please clarify?"
        }],
        sessionAttributes
      );
    }

    // Route to appropriate intent handler based on intentName
    switch (intentName) {
      case "BookingDialog": {
        return await BookingDialog(lexPayload);
      }
      // Add cases for other intents as needed
      
      // Conversation repair - handle when user wants to restart or change topics
      case "RestartDialog": {
        // Clear relevant session attributes to restart conversation
        const clearedAttributes = { ...sessionAttributes };
        delete clearedAttributes.currentBooking;
        delete clearedAttributes.selectedOptions;
        
        return DialogHelpers.elicitIntent(
          lexPayload.sessionState,
          lexPayload.requestAttributes || null,
          [{
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Let's start over. How can I help you today?"
          }],
          clearedAttributes
        );
      }
      
      default: {
        console.log(`No specific handler for intent ${intentName}, using default behavior`);
        return passThrough(lexPayload);
      }
    }
  } catch (error) {
    console.error("Error in MainDialog handler:", error);
    
    // Provide a graceful error response to the user
    return DialogHelpers.elicitIntent(
      lexPayload.sessionState,
      lexPayload.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "I'm having trouble processing your request right now. Could you try again?"
      }],
      lexPayload.sessionState?.sessionAttributes || null
    );
  }
}