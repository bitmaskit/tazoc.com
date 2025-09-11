export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Mock API response - replace with actual shortening logic
  const shortCode = body.customCode || Math.random().toString(36).substr(2, 8)
  
  return {
    shortCode,
    shortUrl: `https://tazoc.com/${shortCode}`,
    originalUrl: body.url || body.originalUrl,
    success: true
  }
})