import * as jmespath from "jmespath";
import {
  LexRequest,
  passThrough
} from "@optum-digital-ce-rx-bots/uhc-cvx-lex-bot-commons";

import BookingDialog from "./intentHandlers/BookingDialog";
import DialogAndWelcomeBot from "./intentHandlers/DialogAndWelcomeBot";
import MainDialog from "./intentHandlers/MainDialog";
import BookingDetails from "./intentHandlers/BookingDetails";

require("dotenv").config();

export async function handler(
  event: Record<string, any>,
  _: any
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

    if (!intentName) {
      console.error("No intent found in request:", { intentName });
      throw new Error("No intent found in request");
    }

    // Save current session attributes for state management
    const sessionAttributes = lexPayload.sessionState?.sessionAttributes || null;
    
    // Route to the appropriate intent handler based on the recognized intent
    switch (intentName) {
      case "BookingDialog": {
        return await BookingDialog(lexPayload);
      }
      case "DialogAndWelcomeBot": {
        return await DialogAndWelcomeBot(lexPayload);
      }
      case "MainDialog": {
        return await MainDialog(lexPayload);
      }
      case "BookingDetails": {
        return await BookingDetails(lexPayload);
      }
      default: {
        // Handle fallback logic when intent cannot be determined
        console.log("Intent not recognized, using fallback response");
        
        // Create fallback response with helpful options
        const fallbackResponse = {
          ...lexPayload,
          sessionState: {
            ...lexPayload.sessionState,
            dialogAction: {
              type: "ElicitIntent"
            },
            messages: [
              {
                contentType: "PlainText",
                content: "I'm not sure I understood what you need. You can ask about booking information, get help with a reservation, or start a new booking."
              }
            ]
          }
        };
        
        return fallbackResponse;
      }
    }
  } catch (error) {
    console.error("Error handling request:", error);
    
    // Handle errors gracefully
    const errorResponse = {
      ...lexPayload,
      sessionState: {
        ...lexPayload.sessionState,
        dialogAction: {
          type: "ElicitIntent"
        },
        messages: [
          {
            contentType: "PlainText",
            content: "I'm having trouble processing your request right now. Could you try again or ask something else?"
          }
        ]
      }
    };
    
    return errorResponse;
  }
}