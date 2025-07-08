// generateCodeVerifier is used to generate the code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
// generateCodeChallenge is used to generate the code challenge
async function generateCodeChallenge(codeVerifier) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)));
  return btoa(String.fromCharCode(...hash))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
// popupLoginWindow is used to open the login popup window
function popupLoginWindow(oAuthUri) {
  const popup = window.open(oAuthUri, 'RingCentral Login', 'width=500,height=600');
  popup.focus();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        reject(new Error('Popup closed'));
      }
    }, 2000);
    window.addEventListener('message', (e) => {
      if (e.data.type === 'rc-login-callback') {
        clearInterval(interval);
        resolve(e.data.code);
      }
    });
  });
}
async function handleLoginEvent() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const oAuthUri = `https://platform.ringcentral.com/restapi/oauth/authorize?response_type=code&client_id=${ringcentralClientId}&redirect_uri=${ringcentralRedirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  console.log('oAuthUri:', oAuthUri);
  popupLoginWindow(oAuthUri).then(code => {
    console.log('code:', code);
    document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
      type: 'rc-adapter-authorization-code',
      callbackUri: `${ringcentralRedirectUri}?code=${code}&code_verifier=${codeVerifier}`
    }, '*');
  });
}

window.addEventListener('message', (e) => {
  const data = e.data;
  if (data) {
    switch (data.type) {
      case 'rc-login-popup-notify':
        // get login oAuthUri from widget
        handleLoginEvent();
        //  window.open(data.oAuthUri); // open oauth uri to login
        break;
      default:
        break;
    }
  }
});
