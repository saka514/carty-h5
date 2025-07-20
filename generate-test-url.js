// Switch to ES Module dynamic import for decryption-service.js
async function generateTestUrl() {
  const module = await import('./public/decryption-service.js');
  const DecryptionService = module.default;
  const service = new DecryptionService();
  // Your test data
  const instructionSet = {
    image_url: 'https://dsp-material.advlove.io/upload/20230414/b906239c100cd2b8ababe97611381204.gif',
    click_url: 'https://play.google.com/store/apps/details?id=com.alibaba.aliexpresshd&gl=it',
    deeplink_url: null, // No deeplink as requested
    auto_click: false,
    deeplink_priority: false,
    auto_click_delay: null
  };
  const baseUrl = 'https://cartyx-2a8d7.web.app/';
  try {
    const encryptedPayload = await service.encrypt(instructionSet);
    const url = new URL(baseUrl);
    url.searchParams.set('payload', encryptedPayload);
    console.log('Generated Test URL:');
    console.log(url.toString());
    console.log('\nInstruction Set:');
    console.log(JSON.stringify(instructionSet, null, 2));
    return url.toString();
  } catch (error) {
    console.error('Error generating test URL:', error.message);
    return null;
  }
}

// Run if called directly
// Remove: if (require.main === module) {
// Replace with:
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  generateTestUrl();
}

// Remove: module.exports = { generateTestUrl };