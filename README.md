# NodeJS QIF to OFX

Convert QIF file to OFX one.

## Using

In the folder of the source code, run:

```shell
npm start <path-to-file> <bank-name?>
```

For example:

```shell
npm start C:\Users\Admin\Downloads\account.qif Bancolombia
```

> The file will be saved to the same directory with the `.ofx` extension.

### Motivation

Colombian banks export transaction in QIF format, but financial management apps just accept OFX files (and I can't find a good software or a working script).
This is to convert Bancolombia QIF file to a OFX file to use in https://organizze.com.br.

For that, you should you config in the first lines of `src/index.js` file (if you want, it's not necessary):

```javascript
// #region Config
const currency = 'BRL'; // Organizze just know BRL
const defaultGMT = '-5:GMT'; // GMT-5 is the Colombian GMT 
// #endregion Config
```
