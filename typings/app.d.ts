/// <reference path="bundle.d.ts" />

declare module 'googleapis' {
  export function adsense(v: string): any;

  module auth {
    export var OAuth2: any;
  }

  export function options(o: any);
}

declare module 'lodash.assign' {
  function assign(...o: any[]): any;
  export = assign;
}
