import { writeFileSync } from 'node:fs';
import { serialize } from 'node-ofx-parser';
import { parseFile } from 'qif2json';

// #region Config
const currency = 'BRL';
const defaultGMT = '-5:GMT';
// #endregion Config

const logger = console;

if (process.argv.length < 3) {
  throw new Error('QIF file must be informed');
}

const file = process.argv[2];

let bankName = 'Bank';

if (process.argv.length > 3) {
  bankName = process.argv[3];
}

function parseDate(str) {
  try {
    const parseYear = str.replace('<invalid date:"', '').replace('">').split("'");
    const intYear = parseInt(parseYear[1], 10);
    const year = intYear < 10 ? `20${20 + intYear}` : `20${intYear}`;
    const dayMonth = parseYear[0].split('/');
    const month = dayMonth[0];
    const dayInt = parseInt(dayMonth[1], 10);
    const day = dayInt < 10 ? `0${dayInt}` : dayInt;

    return `${year}${month}${day}000000[${defaultGMT}]`;
  } catch (error) {
    return str;
  }
}

const header = {
  OFXHEADER: '100',
  DATA: 'OFXSGML',
  VERSION: '102',
  SECURITY: 'NONE',
  ENCODING: 'USASCII',
  CHARSET: '1252',
  COMPRESSION: 'NONE',
  OLDFILEUID: 'NONE',
  NEWFILEUID: 'NONE',
};

logger.log(`Interpreting file ${file}`);

parseFile(file, {
  dateFormat: "MM/D'YY",
}, (err, qifData) => {
  if (err) throw err;

  const parsed = qifData.transactions.map((item) => ({
    ...item,
    memo: item.memo?.toLowerCase(),
    date: item.date.startsWith('<invalid') ? parseDate(item.date) : item.date,
  }));

  // O primeiro item é o balanço atual
  const balance = parsed.shift();
  const account = balance.category.replace('[', '').replace(']', '').split('-');

  const body = {
    SIGNONMSGSRSV1: {
      SONRS: {
        STATUS: {
          CODE: '0',
          SEVERITY: 'INFO',
        },
        DTSERVER: balance.date,
        LANGUAGE: 'ENG',
        FI: {
          ORG: bankName,
          FID: bankName,
        },
      },
    },
    BANKMSGSRSV1: {
      STMTTRNRS: {
        TRNUID: '1',
        STATUS: {
          CODE: '0',
          SEVERITY: 'INFO',
        },
        STMTRS: {
          CURDEF: currency,
          BANKACCTFROM: {
            BANKID: account[0],
            ACCTID: account[1],
            ACCTTYPE: 'CHECKING',
          },
          BANKTRANLIST: {
            DTSTART: parsed[0].date,
            DTEND: parsed[parsed.length - 1].date,
            STMTTRN: parsed.map((t) => ({
              TRNTYPE: 'OTHER',
              DTPOSTED: t.date,
              TRNAMT: `${t.amount}`,
              FITID: '000000',
              CHECKNUM: '000000',
              PAYEEID: '0',
              MEMO: t.memo,
            })),
          },
          LEDGERBAL: {
            BALAMT: balance.amount,
            DTASOF: balance.date,
          },
        },
      },
    },
  };

  const final = serialize(header, body);
  const ofxFile = file.replace('.qif', '.ofx');

  writeFileSync(ofxFile, final, {
    encoding: 'ascii',
  });

  logger.log(`Saving OFX file to ${ofxFile}`);
});
