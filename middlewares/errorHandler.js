export function errorHandler(err, req, res, next) {
  // Invalid JSON (thrown by express.json / body-parser)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON body",
    });
  }

  // Log full error server-side
  console.error(err);

  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);

  // Default safe error
  res.status(err.status || 500).json({
    error: "Internal server error",
  });
}
