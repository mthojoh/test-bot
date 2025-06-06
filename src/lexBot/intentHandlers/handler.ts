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
        console.log("Intent not recognized, providing fallback response");
        // Fallback logic - provide a helpful message when intent can't be determined
        const DialogHelpers = require("./utils/sharedLibraries/DialogHelpers");
        const sessionAttributes = lexPayload.sessionState?.sessionAttributes || null;
        
        return DialogHelpers.elicitIntent(
          lexPayload.sessionState,
          lexPayload.requestAttributes || null,
          [
            {
              contentType: "PlainText",
              content: "I'm not sure what you're asking for. Would you like to make a booking, check booking details, or get general help?"
            }
          ],
          sessionAttributes
        );
      }
    }
  } catch (error) {
    console.error("Error handling request:", error);
    return passThrough(lexPayload);
  }
}