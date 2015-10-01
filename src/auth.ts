/// <reference path="../typings/app.d.ts" />

import * as googleapis from 'googleapis';

let adsense = googleapis.adsense('v1.4');
let OAuth2  = googleapis.auth.OAuth2;

export let client = new OAuth2(
    '152727115107-vg6qtqpe38fuqbdlio806u04bdg6jgor.apps.googleusercontent.com',
    'XuNs2AI0lUarqnJMMMJpuk-m',
    'urn:ietf:wg:oauth:2.0:oob'
)

googleapis.options({ auth: client });

// https://developers.google.com/adsense/management/direct_requests
const scopes = [
  'https://www.googleapis.com/auth/adsense.readonly'
];

export interface Tokens {
  access_token:  string;
  token_type:    string;
  refresh_token: string;
  expiry_date:   number;
}

export function getAuthUrl(): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
}

export function setTokens(t: Tokens) {
  client.setCredentials(t);
}

export function getAccessToken(code: string): Promise<Tokens> {
  return new Promise((resolve, reject) => {
    client.getToken(code, function (err, t) {
      if (err) {
        console.error('getToken:', err);
        reject(err);
      } else {
        client.setCredentials(t);
        console.log('getToken:', t);
        resolve(t);
      }
    });
  })
}

export function isAuthenticated(): boolean {
  return !!client.credentials;
}
