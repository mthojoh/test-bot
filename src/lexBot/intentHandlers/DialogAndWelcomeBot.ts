import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces"
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2"
import { IntentNames } from "../types/constants"

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers")
const CommonUtils = require("../utils/sharedLibraries/CommonUtils")

/**
 * Handler for the DialogAndWelcomeBot intent
 * Handles the initial interaction with the user, including welcome messages and onboarding.
 */
export function handler(event: LexCodeHookInputEvent) {
  let response = DialogHelpers.passThrough(event)
  const intent = event.sessionState.intent

  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.DIALOG_AND_WELCOME_BOT) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`)
    return response
  }

  try {
    const sessionAttributes = event.sessionState.sessionAttributes || null
    
    // Step 1: Send a welcome message to the user
    const welcomeMessage = "Welcome to our booking assistant! How can I help you today?"
    
    // Step 2: Provide options for the user
    const optionsMessage = "You can say 'I want to make a booking' or 'I need help'."
    
    // Combine messages
    const messages = [
      {
        contentType: MessageContentType.PLAIN_TEXT,
        content: welcomeMessage
      },
      {
        contentType: MessageContentType.PLAIN_TEXT,
        content: optionsMessage
      }
    ]
    
    // Mark that we've shown the welcome message
    sessionAttributes.hasSeenWelcome = "true"
    
    // Step 3: Route is handled implicitly by returning elicitIntent response
    // This allows the bot to listen for the user's next input and match to appropriate intent
    
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      messages,
      sessionAttributes
    )
  } catch (error) {
    console.error("Error in DialogAndWelcomeBot handler:", error)
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [{
        contentType: MessageContentType.PLAIN_TEXT,
        content: "I'm having trouble processing your request. Could you try again?"
      }],
      event.sessionState.sessionAttributes || null
    )
  }
}