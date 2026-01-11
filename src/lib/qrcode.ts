import QRCode from 'qrcode'

/**
 * Generates a QR code as a data URL from a student's cardId
 * The QR code encodes the cardId UUID which is used for scanning
 */
export async function generateQRCodeDataURL(cardId: string): Promise<string> {
  return QRCode.toDataURL(cardId, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 200,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

/**
 * Generates multiple QR codes in parallel
 * Returns an array of objects with cardId and corresponding data URL
 */
export async function generateMultipleQRCodes(
  cardIds: string[]
): Promise<{ cardId: string; dataUrl: string }[]> {
  const results = await Promise.all(
    cardIds.map(async (cardId) => ({
      cardId,
      dataUrl: await generateQRCodeDataURL(cardId)
    }))
  )
  return results
}
