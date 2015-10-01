/// <reference path="../typings/app.d.ts" />

import * as googleapis from 'googleapis';

import * as auth from './auth';

let adsense = googleapis.adsense('v1.4');

let account: Account;

function getAccount(): Promise<Account> {
  if (account) {
    return Promise.resolve(account);
  }

  return getAccountList().then((accounts: Account[]) => {
    return account = accounts[0];
  });
}

export function reset() {
  account = null;
}

export interface Account {
  id:          string;
  kind:        string;
  name:        string;
  premium:     boolean;
  subaccounts: Account[];
  timezone:    string;
}

export interface Report {
  kind:             string;
  totalMatchedRows: number;
  headers:          {
    name:      string;
    type:      string;
    currency?: string;
  }[];
  rows:      (string|number)[][];
  totals:    number[];
  averages:  number[];
  warnings:  string[];
  startDate: string;
  endDate:   string;
}

function dateYMD(dt: Date): string {
  return [
    dt.getFullYear(),
    ('0' + (dt.getMonth() + 1)).substr(-2),
    ('0' + (dt.getDate().toString()).substr(-2))
  ].join('-');
}

interface IGetReportOptions {
  startDate?: string;
  endDate?:   string;
  metric?:    string;
  dimension?: string;
}

export interface ReportResult {
  report:  Report;
  account: Account;
}

export function getReport(opts?: IGetReportOptions): Promise<ReportResult> {
  return getAccount().then((acc: Account) => {
    return new Promise((ok, ng) => {
      opts = opts || {};
      adsense.accounts.reports.generate({
        startDate:            opts.startDate || 'today',
        endDate:              opts.endDate   || 'today',
        metric:               opts.metric    || 'EARNINGS',
        dimension:            opts.dimension || 'DATE',
        accountId:            acc.id,
        useTimezoneReporting: true
      }, (err, rep: Report) => {
        console.log(err, rep);
        if (err) {
          ng(err);
        } else {
          ok({ report: rep, account: acc });
        }
      });
    });
  });
}

export function getAccountList(): Promise<Account[]> {
  return new Promise((ok, ng) => {
    adsense.accounts.list({}, (err, res) => {
      console.log(err, res);
      if (err) {
        ng(err);
      } else {
        ok(res.items);
      }
    });
  });
}
