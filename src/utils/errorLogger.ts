/**
 * Logs a critical error to the console and simulates reporting to a monitoring service.
 * @param error The error object or message.
 * @param context Optional context data (e.g., component name, function name).
 */
export const logError = (error: unknown, context?: Record<string, any>) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  console.error("--- CRITICAL ERROR REPORT ---");
  console.error("Message:", errorMessage);
  if (context) {
    console.error("Context:", context);
  }
  
  // Simulação de envio para Sentry/Datadog/etc.
  // if (process.env.NODE_ENV === 'production') {
  //   // Ex: Sentry.captureException(error, { extra: context });
  //   console.warn("Simulating error report submission to monitoring service.");
  // }
  
  console.error("-----------------------------");
};