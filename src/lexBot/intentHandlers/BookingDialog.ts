import { LexCodeHookInputEvent } from "../utils/sharedLibraries/LexCodeHookInterfaces"
import { MessageContentType } from "@aws-sdk/client-lex-runtime-v2"
import { IntentNames } from "../types/constants"

const DialogHelpers = require("../utils/sharedLibraries/DialogHelpers")
const CommonUtils = require("../utils/sharedLibraries/CommonUtils")

export function handler(event: LexCodeHookInputEvent) {
  let response = DialogHelpers.passThrough(event)
  const intent = event.sessionState.intent

  // @ts-ignore intent will never be undefined in the Intent Handler
  if (intent.name !== IntentNames.BOOKING_DIALOG) {
    console.error(`Wrong handler for intent called, current intent is ${intent.name}`)
    return response
  }

  // Get session attributes and slots
  const sessionAttributes = event.sessionState.sessionAttributes || null
  const slots = intent.slots || null
  
  // Step 1: Acknowledge user's intent to book.
  if (!sessionAttributes.bookingStarted) {
    sessionAttributes.bookingStarted = "true"
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "Origin",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I'll help you book your trip. What's your departure city?"
        }
      ],
      sessionAttributes
    )
  }
  
  // Step 2: Collect required slots
  // Check for Origin
  if (!slots.Origin || !slots.Origin.value || !slots.Origin.value.interpretedValue) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "Origin",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "What city are you departing from?"
        }
      ],
      sessionAttributes
    )
  }
  
  // Check for TravelDate
  if (!slots.TravelDate || !slots.TravelDate.value || !slots.TravelDate.value.interpretedValue) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "TravelDate",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "When would you like to travel?"
        }
      ],
      sessionAttributes
    )
  }
  
  // Step 3: Validate the TravelDate format
  if (slots.TravelDate && slots.TravelDate.value && slots.TravelDate.value.interpretedValue) {
    const travelDate = slots.TravelDate.value.interpretedValue
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    
    if (!dateRegex.test(travelDate)) {
      // Handle invalid date format edge case
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Please provide a valid date in YYYY-MM-DD format."
          }
        ],
        sessionAttributes
      )
    }
    
    const currentDate = new Date()
    const selectedDate = new Date(travelDate)
    
    if (selectedDate < currentDate) {
      return DialogHelpers.elicitSlot(
        event.sessionState,
        event.requestAttributes || null,
        "TravelDate",
        [
          {
            contentType: MessageContentType.PLAIN_TEXT,
            content: "Please select a future date for your travel."
          }
        ],
        sessionAttributes
      )
    }
  }
  
  // Check for Destination
  if (!slots.Destination || !slots.Destination.value || !slots.Destination.value.interpretedValue) {
    return DialogHelpers.elicitSlot(
      event.sessionState,
      event.requestAttributes || null,
      "Destination",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "What is your destination?"
        }
      ],
      sessionAttributes
    )
  }
  
  // Step 4: Confirm the booking details with the user
  const origin = slots.Origin.value?.interpretedValue || ""
  const destination = slots.Destination.value?.interpretedValue || ""
  const travelDate = slots.TravelDate.value?.interpretedValue || ""
  
  if (!sessionAttributes.confirmationRequested) {
    sessionAttributes.confirmationRequested = "true"
    return DialogHelpers.confirmIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `Please confirm your booking details:\nFrom: ${origin}\nTo: ${destination}\nDate: ${travelDate}\n\nWould you like to proceed with this booking?`
        }
      ],
      sessionAttributes
    )
  }
  
  // Step 5 & 6: Process the booking if confirmed and provide confirmation
  if (event.invocationSource === "DialogCodeHook" && 
      event.sessionState.intent.confirmationState === "Confirmed") {
    
    // Here you would typically call an API to create the booking
    // For this example, we'll just acknowledge the booking was made
    delete sessionAttributes.bookingStarted
    delete sessionAttributes.confirmationRequested
    
    return DialogHelpers.close(
      event.sessionState,
      event.requestAttributes || null,
      "Fulfilled",
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: `Great! I've booked your trip from ${origin} to ${destination} on ${travelDate}. Your booking is confirmed!`
        }
      ],
      sessionAttributes
    )
  } else if (event.sessionState.intent.confirmationState === "Denied") {
    // User changed their mind
    delete sessionAttributes.bookingStarted
    delete sessionAttributes.confirmationRequested
    
    return DialogHelpers.elicitIntent(
      event.sessionState,
      event.requestAttributes || null,
      [
        {
          contentType: MessageContentType.PLAIN_TEXT,
          content: "I've cancelled this booking. Is there something else you would like to do?"
        }
      ],
      sessionAttributes
    )
  }
  
  // Default passthrough
  return response
}